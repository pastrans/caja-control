import { Component, DestroyRef, OnInit, TemplateRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, expand, reduce } from 'rxjs';
import { NgbModal, NgbModalModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { PurchaseProductsService } from '../../../services/purchase-products.service';
import { SuppliersService } from '../../../services/suppliers.service';
import {
  ProductMergeDTO,
  ProductMergeSuggestionDTO,
  ProductPriceStatsDTO,
  ProductSummaryDTO,
  SupplierDTO
} from '../../../models/compras.model';
import { FechaDtePipe, UnidadMedidaPipe } from '../../../pipes/compras.pipes';
import { NotaGuiaComponent, PasoGuia } from '../../../components/nota-guia/nota-guia.component';

type Vista = 'sugerencias' | 'manual' | 'uniones';

// Qué se va a unir en una sugerencia: el principal y los que se incluyen (el principal siempre está)
interface SeleccionSugerencia {
  principal: string;
  incluidos: string[];
}

const PRODUCTOS_POR_PAGINA = 100; // Máximo del backend; un proveedor tiene ~100 productos

@Component({
  selector: 'app-variantes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbNavModule, NgbModalModule, FechaDtePipe, UnidadMedidaPipe, NotaGuiaComponent],
  templateUrl: './variantes.component.html'
})
export class VariantesComponent implements OnInit {
  private readonly purchaseProductsService = inject(PurchaseProductsService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly modalService = inject(NgbModal);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly pasosGuia: PasoGuia[] = [
    { titulo: 'Revisa las sugerencias', texto: 'El sistema agrupa productos de un mismo proveedor con nombres casi iguales.' },
    { titulo: 'Elige el principal', texto: 'Es el que conserva el nombre. Por defecto, el que tiene más compras.' },
    { titulo: 'Une o descarta', texto: 'Al unir, sus compras se suman en un solo historial. Si no son el mismo, descarta la sugerencia.' }
  ];
  readonly consejosGuia = [
    'Unir no modifica las facturas: solo cambia cómo se agrupan los precios. Puedes separarlos cuando quieras en "Uniones hechas".',
    'Une solo productos que se venden en la misma unidad. Si uno se vende por libra y otro por bolsa, los precios no se pueden comparar.',
    'Las variantes se buscan en todo el historial, no solo en el periodo que estés viendo.'
  ];

  // Filtros (reflejo de la URL)
  vista = signal<Vista>('sugerencias');
  supplierId = signal<number | null>(null);
  proveedores = signal<SupplierDTO[]>([]);

  // Mensajes
  errorMessage = signal<string | null>(null);
  mensajeExito = signal<string | null>(null);
  procesando = signal<string | null>(null); // Clave de la acción en curso (desactiva sus botones)
  private cargado = false;

  // Sugerencias
  sugerencias = signal<ProductMergeSuggestionDTO[]>([]);
  seleccion = signal<Record<string, SeleccionSugerencia>>({});
  isLoadingSugerencias = signal<boolean>(false);

  // Uniones hechas
  uniones = signal<ProductMergeDTO[]>([]);
  isLoadingUniones = signal<boolean>(false);

  // Unir manualmente
  productos = signal<ProductPriceStatsDTO[]>([]);
  isLoadingProductos = signal<boolean>(false);
  filtroManual = signal<string>('');
  principalManual = signal<string | null>(null);
  variantesManual = signal<string[]>([]);
  confirmaUnidades = signal<boolean>(false);

  productosFiltrados = computed(() => {
    const texto = this.normalizar(this.filtroManual());
    const lista = this.productos();
    if (!texto) return lista;
    return lista.filter(p => this.normalizar(`${p.name} ${p.ref}`).includes(texto));
  });

  seleccionManual = computed(() => {
    const porClave = new Map(this.productos().map(p => [p.key, p]));
    const principal = this.principalManual() ? porClave.get(this.principalManual()!) ?? null : null;
    const variantes = this.variantesManual().map(k => porClave.get(k)).filter((p): p is ProductPriceStatsDTO => !!p);
    return { principal, variantes };
  });

  unidadesDistintasManual = computed(() => {
    const { principal, variantes } = this.seleccionManual();
    return !!principal && variantes.some(v => v.unitOfMeasure !== principal.unitOfMeasure);
  });

  puedeUnirManual = computed(() => {
    const { principal, variantes } = this.seleccionManual();
    return !!principal && variantes.length > 0 && (!this.unidadesDistintasManual() || this.confirmaUnidades());
  });

  ngOnInit(): void {
    this.suppliersService.getSuppliers(1, 100).subscribe({
      next: (res) => this.proveedores.set(res.items),
      error: () => this.proveedores.set([])
    });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const vista = params.get('vista') as Vista | null;
        this.vista.set(vista === 'manual' || vista === 'uniones' ? vista : 'sugerencias');

        const numero = Number(params.get('supplierId'));
        const supplierId = Number.isInteger(numero) && numero > 0 ? numero : null;

        // Desde el detalle de un producto se llega con ?principal= para unirle variantes
        const principal = params.get('principal');
        if (principal) this.principalManual.set(principal);

        // Cambiar de pestaña no recarga; cambiar de proveedor (o la primera vez) sí
        if (this.cargado && supplierId === this.supplierId()) return;
        this.cargado = true;
        this.supplierId.set(supplierId);
        this.cargarTodo();
      });
  }

  cargarTodo(): void {
    this.cargarSugerencias();
    this.cargarUniones();
    this.cargarProductos();
  }

  cargarSugerencias(): void {
    this.isLoadingSugerencias.set(true);
    this.purchaseProductsService.getSuggestions(this.supplierId() ?? undefined).subscribe({
      next: (res) => {
        this.sugerencias.set(res);
        // Por defecto se incluyen todos y el principal es el sugerido
        this.seleccion.set(Object.fromEntries(res.map(s => [this.claveSugerencia(s), {
          principal: s.suggestedKey,
          incluidos: s.products.map(p => p.key)
        }])));
        this.isLoadingSugerencias.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al cargar las sugerencias.');
        this.isLoadingSugerencias.set(false);
      }
    });
  }

  cargarUniones(): void {
    this.isLoadingUniones.set(true);
    this.purchaseProductsService.getMerges(this.supplierId() ?? undefined).subscribe({
      next: (res) => {
        this.uniones.set(res);
        this.isLoadingUniones.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al cargar las uniones.');
        this.isLoadingUniones.set(false);
      }
    });
  }

  // Todos los productos del proveedor en todo el historial (para unir a mano); sin proveedor no se carga nada
  cargarProductos(): void {
    const supplierId = this.supplierId();
    this.productos.set([]);
    if (!supplierId) return;

    this.isLoadingProductos.set(true);
    const pagina = (page: number) => this.purchaseProductsService.getProducts(
      { period: 'all', supplierId, sort: 'name', order: 'asc' }, page, PRODUCTOS_POR_PAGINA
    );

    pagina(1).pipe(
      expand(res => res.page * res.limit < res.total ? pagina(res.page + 1) : EMPTY),
      reduce((todos, res) => [...todos, ...res.data], [] as ProductPriceStatsDTO[])
    ).subscribe({
      next: (todos) => {
        this.productos.set(todos);
        // Si el principal preseleccionado ahora es variante de otro, no está en la lista
        if (this.principalManual() && !todos.some(p => p.key === this.principalManual())) this.principalManual.set(null);
        this.isLoadingProductos.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al cargar los productos del proveedor.');
        this.isLoadingProductos.set(false);
      }
    });
  }

  cambiarVista(vista: Vista): void {
    this.navegar({ vista: vista === 'sugerencias' ? null : vista });
  }

  cambiarProveedor(id: number | null): void {
    this.principalManual.set(null);
    this.variantesManual.set([]);
    this.confirmaUnidades.set(false);
    this.navegar({ supplierId: id, principal: null });
  }

  private navegar(cambios: Params): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: cambios, queryParamsHandling: 'merge' });
  }

  // ---------- Sugerencias ----------

  claveSugerencia(s: ProductMergeSuggestionDTO): string {
    return `${s.supplierId}|${s.signature}`;
  }

  seleccionDe(s: ProductMergeSuggestionDTO): SeleccionSugerencia {
    return this.seleccion()[this.claveSugerencia(s)] ?? { principal: s.suggestedKey, incluidos: [] };
  }

  elegirPrincipal(s: ProductMergeSuggestionDTO, key: string): void {
    const actual = this.seleccionDe(s);
    const incluidos = actual.incluidos.includes(key) ? actual.incluidos : [...actual.incluidos, key];
    this.actualizarSeleccion(s, { principal: key, incluidos });
  }

  alternarIncluido(s: ProductMergeSuggestionDTO, key: string): void {
    const actual = this.seleccionDe(s);
    if (key === actual.principal) return; // El principal siempre está incluido
    const incluidos = actual.incluidos.includes(key)
      ? actual.incluidos.filter(k => k !== key)
      : [...actual.incluidos, key];
    this.actualizarSeleccion(s, { ...actual, incluidos });
  }

  private actualizarSeleccion(s: ProductMergeSuggestionDTO, valor: SeleccionSugerencia): void {
    this.seleccion.update(sel => ({ ...sel, [this.claveSugerencia(s)]: valor }));
  }

  variantesAUnir(s: ProductMergeSuggestionDTO): string[] {
    const sel = this.seleccionDe(s);
    return sel.incluidos.filter(k => k !== sel.principal);
  }

  // ¿Lo que se va a unir mezcla unidades de medida?
  mezclaUnidades(s: ProductMergeSuggestionDTO): boolean {
    const sel = this.seleccionDe(s);
    const unidades = new Set(s.products.filter(p => sel.incluidos.includes(p.key)).map(p => p.unitOfMeasure));
    return unidades.size > 1;
  }

  unirSugerencia(s: ProductMergeSuggestionDTO): void {
    const sel = this.seleccionDe(s);
    const variantes = this.variantesAUnir(s);
    if (variantes.length === 0) return;
    const principal = s.products.find(p => p.key === sel.principal);
    this.unir(this.claveSugerencia(s), sel.principal, variantes, principal?.name ?? 'el producto principal');
  }

  descartarSugerencia(s: ProductMergeSuggestionDTO): void {
    const clave = this.claveSugerencia(s);
    this.procesando.set(clave);
    this.limpiarMensajes();

    this.purchaseProductsService.dismissSuggestion(s.supplierId, s.signature).subscribe({
      next: () => {
        this.sugerencias.update(lista => lista.filter(x => this.claveSugerencia(x) !== clave));
        this.mensajeExito.set(`Listo: "${s.products[0].name}" y sus parecidos no se volverán a sugerir.`);
        this.procesando.set(null);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al descartar la sugerencia.');
        this.procesando.set(null);
      }
    });
  }

  // ---------- Unir manualmente ----------

  elegirPrincipalManual(key: string): void {
    this.principalManual.set(key);
    this.variantesManual.update(lista => lista.filter(k => k !== key));
    this.confirmaUnidades.set(false);
  }

  alternarVarianteManual(key: string): void {
    if (key === this.principalManual()) return;
    this.variantesManual.update(lista => lista.includes(key) ? lista.filter(k => k !== key) : [...lista, key]);
    this.confirmaUnidades.set(false);
  }

  unirManual(): void {
    const { principal, variantes } = this.seleccionManual();
    if (!principal || variantes.length === 0 || !this.puedeUnirManual()) return;
    this.unir('manual', principal.key, variantes.map(v => v.key), principal.name);
  }

  private unir(accion: string, principal: string, variantes: string[], nombre: string): void {
    this.procesando.set(accion);
    this.limpiarMensajes();

    this.purchaseProductsService.merge(principal, variantes).subscribe({
      next: (res) => {
        this.mensajeExito.set(`Se ${res.variants === 1 ? 'unió 1 variante' : `unieron ${res.variants} variantes`} a "${nombre}". Sus compras ya se suman en un solo historial.`);
        this.variantesManual.set([]);
        this.confirmaUnidades.set(false);
        this.procesando.set(null);
        this.cargarTodo();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al unir los productos.');
        this.procesando.set(null);
      }
    });
  }

  // ---------- Uniones hechas ----------

  separar(variante: ProductSummaryDTO, modal: TemplateRef<unknown>): void {
    this.modalService.open(modal, { centered: true }).result.then(
      (resultado) => {
        if (resultado !== 'confirmar') return;
        this.procesando.set(variante.key);
        this.limpiarMensajes();

        this.purchaseProductsService.unmerge(variante.key).subscribe({
          next: () => {
            this.mensajeExito.set(`"${variante.name}" volvió a ser un producto aparte.`);
            this.procesando.set(null);
            this.cargarTodo();
          },
          error: (err) => {
            this.errorMessage.set(err.error?.error || 'Error al separar la variante.');
            this.procesando.set(null);
          }
        });
      },
      () => { /* Modal cerrado sin confirmar */ }
    );
  }

  queryProducto(key: string): Params {
    return { key, months: 'all' };
  }

  private limpiarMensajes(): void {
    this.errorMessage.set(null);
    this.mensajeExito.set(null);
  }

  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
}
