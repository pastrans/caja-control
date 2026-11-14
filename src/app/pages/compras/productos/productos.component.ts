import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { NgbPaginationModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PurchaseProductsService } from '../../../services/purchase-products.service';
import { SuppliersService } from '../../../services/suppliers.service';
import {
  ProductPeriod,
  ProductPriceStatsDTO,
  ProductSort,
  ProductsTrendSummary,
  SupplierDTO
} from '../../../models/compras.model';
import { FechaDtePipe, UnidadMedidaPipe } from '../../../pipes/compras.pipes';
import { PERIODOS_PRODUCTOS, confianzaTendencia } from '../../../utils/compras.utils';

interface Orden {
  id: string;
  label: string;
  sort: ProductSort;
  order: 'asc' | 'desc';
}

const ORDENES: Orden[] = [
  { id: 'gasto', label: 'Mayor gasto', sort: 'spent', order: 'desc' },
  { id: 'alza', label: 'Más subieron en el periodo', sort: 'change', order: 'desc' },
  { id: 'baja', label: 'Más bajaron en el periodo', sort: 'change', order: 'asc' },
  { id: 'tendencia-alza', label: 'Tendencia al alza', sort: 'trend', order: 'desc' },
  { id: 'tendencia-baja', label: 'Tendencia a la baja', sort: 'trend', order: 'asc' },
  { id: 'recientes', label: 'Comprados recientemente', sort: 'recent', order: 'desc' },
  { id: 'nombre', label: 'Nombre', sort: 'name', order: 'asc' }
];

const PERIODO_DEFECTO: ProductPeriod = 12;

// Precios de lo que se compra a los proveedores. Los filtros viven en la URL
// para poder llegar ya filtrado desde la ficha del proveedor
@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbPaginationModule, NgbTooltipModule, FechaDtePipe, UnidadMedidaPipe],
  templateUrl: './productos.component.html'
})
export class ProductosComponent implements OnInit {
  private readonly purchaseProductsService = inject(PurchaseProductsService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  readonly periodos = PERIODOS_PRODUCTOS;
  readonly ordenes = ORDENES;
  readonly confianza = confianzaTendencia;

  // Estados reactivos
  productos = signal<ProductPriceStatsDTO[]>([]);
  resumen = signal<ProductsTrendSummary | null>(null);
  proveedores = signal<SupplierDTO[]>([]);
  rango = signal<{ from: string; to: string } | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Filtros (reflejo de la URL)
  periodo = signal<ProductPeriod>(PERIODO_DEFECTO);
  supplierId = signal<number | null>(null);
  busqueda = signal<string>('');
  orden = signal<Orden>(ORDENES[0]);

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  totalRecords = signal<number>(0);

  ngOnInit(): void {
    this.suppliersService.getSuppliers(1, 100).subscribe({
      next: (res) => this.proveedores.set(res.items),
      error: () => this.proveedores.set([])
    });

    this.busqueda$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(texto => this.navegar({ q: texto || null, page: null }));

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const months = params.get('months');
        const numero = Number(months);
        this.periodo.set(months === 'all' ? 'all' : Number.isInteger(numero) && numero > 0 ? numero : PERIODO_DEFECTO);

        const supplierId = Number(params.get('supplierId'));
        this.supplierId.set(Number.isInteger(supplierId) && supplierId > 0 ? supplierId : null);

        this.busqueda.set(params.get('q') ?? '');
        this.orden.set(ORDENES.find(o => o.id === params.get('orden')) ?? ORDENES[0]);

        const page = Number(params.get('page'));
        this.currentPage.set(Number.isInteger(page) && page > 0 ? page : 1);

        this.cargarProductos();
      });
  }

  cargarProductos(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const orden = this.orden();
    this.purchaseProductsService.getProducts({
      period: this.periodo(),
      supplierId: this.supplierId() ?? undefined,
      search: this.busqueda(),
      sort: orden.sort,
      order: orden.order
    }, this.currentPage(), this.pageSize()).subscribe({
      next: (res) => {
        this.productos.set(res.data);
        this.resumen.set(res.summary);
        this.rango.set({ from: res.from, to: res.to });
        this.totalRecords.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al cargar el análisis de productos.');
        this.isLoading.set(false);
      }
    });
  }

  onBuscar(texto: string): void {
    this.busqueda.set(texto);
    this.busqueda$.next(texto.trim());
  }

  cambiarPeriodo(periodo: ProductPeriod): void {
    this.navegar({ months: periodo === PERIODO_DEFECTO ? null : periodo, page: null });
  }

  cambiarProveedor(id: number | null): void {
    this.navegar({ supplierId: id, page: null });
  }

  cambiarOrden(id: string): void {
    this.navegar({ orden: id === ORDENES[0].id ? null : id, page: null });
  }

  onPageChange(page: number): void {
    this.navegar({ page: page > 1 ? page : null });
  }

  // Parámetros con null se quitan de la URL
  private navegar(cambios: Params): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: cambios, queryParamsHandling: 'merge' });
  }

  // El periodo del detalle es el mismo del listado
  queryDetalle(producto: ProductPriceStatsDTO): Params {
    return { key: producto.key, months: this.periodo() === PERIODO_DEFECTO ? null : this.periodo() };
  }
}
