import { Component, DestroyRef, OnInit, TemplateRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbModal, NgbModalModule, NgbPaginationModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PurchaseProductsService } from '../../../services/purchase-products.service';
import { ProductHistoryDTO, ProductPeriod, ProductPricePointDTO, ProductVariantInfoDTO } from '../../../models/compras.model';
import { NotaGuiaComponent } from '../../../components/nota-guia/nota-guia.component';
import { FechaDtePipe, UnidadMedidaPipe } from '../../../pipes/compras.pipes';
import {
  MESES_LARGOS,
  PERIODOS_PRODUCTOS,
  confianzaTendencia,
  formatearFechaDte,
  indiceMes,
  unidadMedida
} from '../../../utils/compras.utils';
import { GraficaPreciosComponent } from '../../../components/grafica-precios/grafica-precios.component';

const PERIODO_DEFECTO: ProductPeriod = 12;
const COMPRAS_POR_PAGINA = 20;

interface CompraConCambio extends ProductPricePointDTO {
  cambioPct: number | null; // Contra la compra anterior, a 1 decimal; null si es la primera o no cambió
}

const precio = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const porcentaje = (valor: number) => `${Math.abs(valor).toLocaleString('es-SV', { maximumFractionDigits: 1 })} %`;

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, NgbModalModule, NgbPaginationModule, NgbTooltipModule,
    FechaDtePipe, UnidadMedidaPipe, GraficaPreciosComponent, NotaGuiaComponent
  ],
  templateUrl: './producto-detalle.component.html'
})
export class ProductoDetalleComponent implements OnInit {
  private readonly purchaseProductsService = inject(PurchaseProductsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(NgbModal);

  readonly periodos = PERIODOS_PRODUCTOS;
  readonly confianza = confianzaTendencia;
  readonly comprasPorPagina = COMPRAS_POR_PAGINA;

  historial = signal<ProductHistoryDTO | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  periodo = signal<ProductPeriod>(PERIODO_DEFECTO);
  paginaCompras = signal<number>(1);
  separando = signal<string | null>(null); // Variante que se está separando
  mensajeExito = signal<string | null>(null);
  private key = '';

  producto = computed(() => this.historial()?.product ?? null);
  unidad = computed(() => unidadMedida(this.producto()?.unitOfMeasure ?? 0));
  ultimaProyeccion = computed(() => this.historial()?.projection.at(-1) ?? null);

  // Más reciente primero, con el cambio respecto a la compra anterior
  compras = computed<CompraConCambio[]>(() => {
    const puntos = this.historial()?.points ?? [];
    return puntos
      .map((p, i) => {
        const anterior = i > 0 ? puntos[i - 1].unitPrice : 0;
        const cambio = anterior > 0 ? Math.round(((p.unitPrice - anterior) / anterior) * 1000) / 10 : 0;
        return { ...p, cambioPct: cambio === 0 ? null : cambio };
      })
      .reverse();
  });

  comprasVisibles = computed(() => {
    const inicio = (this.paginaCompras() - 1) * COMPRAS_POR_PAGINA;
    return this.compras().slice(inicio, inicio + COMPRAS_POR_PAGINA);
  });

  meses = computed(() => [...(this.historial()?.monthly ?? [])].reverse());

  // Lectura en lenguaje simple de los números
  interpretacion = computed<string[]>(() => {
    const h = this.historial();
    if (!h) return [];
    const p = h.product;
    const u = this.unidad().corto;
    const frases: string[] = [];

    frases.push(p.purchases === 1
      ? `Una sola compra en el periodo, el ${formatearFechaDte(p.lastDate)}, a ${precio.format(p.lastPrice)}/${u}.`
      : `${p.purchases} compras entre el ${formatearFechaDte(p.firstDate)} y el ${formatearFechaDte(p.lastDate)}.`);

    if (p.purchases > 1) {
      const verbo = p.changePct > 0 ? 'subió' : p.changePct < 0 ? 'bajó' : 'se mantuvo';
      frases.push(p.changePct === 0
        ? `El precio se mantuvo en ${precio.format(p.lastPrice)}/${u} entre la primera y la última compra.`
        : `El precio ${verbo} ${porcentaje(p.changePct)}: de ${precio.format(p.firstPrice)} a ${precio.format(p.lastPrice)} por ${u}.`);
    }

    const t = p.trend;
    if (!t) {
      if (p.purchases > 1) frases.push('Con menos de 4 compras o menos de 60 días entre la primera y la última no se calcula una tendencia.');
      return frases;
    }

    if (t.direction === 'flat') {
      frases.push(`En general el precio está estable (${t.pctPerMonth > 0 ? '+' : ''}${t.pctPerMonth.toLocaleString('es-SV')} % al mes).`);
    } else {
      frases.push(`La tendencia es ${t.direction === 'up' ? 'al alza' : 'a la baja'}: ${porcentaje(t.pctPerMonth)} al mes, unos ${precio.format(Math.abs(t.slopePerMonth))} por ${u}.`);
    }

    const proyeccion = this.ultimaProyeccion();
    if (proyeccion && t.direction !== 'flat') {
      frases.push(`Si sigue igual, hacia el ${formatearFechaDte(proyeccion.date)} rondaría ${precio.format(proyeccion.price)}/${u}.`);
    }

    if (t.r2 < 0.2) {
      frases.push('Ojo: el precio sube y baja mucho entre compras, así que esta tendencia es poco confiable.');
    }
    return frases;
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const key = params.get('key') ?? '';
        const months = params.get('months');
        const numero = Number(months);
        const periodo: ProductPeriod = months === 'all' ? 'all' : Number.isInteger(numero) && numero > 0 ? numero : PERIODO_DEFECTO;

        // Al reemplazar la clave de una variante por la del principal ya está cargado
        if (key === this.historial()?.product.key && periodo === this.periodo()) return;

        this.key = key;
        this.periodo.set(periodo);
        this.paginaCompras.set(1);
        this.cargar();
      });
  }

  cargar(): void {
    if (!this.key) {
      this.errorMessage.set('No se indicó el producto.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.purchaseProductsService.getHistory(this.key, this.periodo()).subscribe({
      next: (res) => {
        this.historial.set(res);
        this.isLoading.set(false);
        // Si se pidió una variante, la URL pasa a ser la del producto principal (sin recargar)
        if (res.product.key !== this.key) {
          this.key = res.product.key;
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { key: res.product.key },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }
      },
      error: (err) => {
        this.historial.set(null);
        this.errorMessage.set(err.status === 404
          ? 'No hay compras de este producto en el periodo. Prueba con un periodo más largo.'
          : err.error?.error || 'Error al cargar el historial del producto.');
        this.isLoading.set(false);
      }
    });
  }

  cambiarPeriodo(periodo: ProductPeriod): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { months: periodo === PERIODO_DEFECTO ? null : periodo },
      queryParamsHandling: 'merge'
    });
  }

  nombreMes(mes: string): string {
    return `${MESES_LARGOS[indiceMes(mes)]} ${mes.slice(0, 4)}`;
  }

  separarVariante(variante: ProductVariantInfoDTO, modal: TemplateRef<unknown>): void {
    this.modalService.open(modal, { centered: true }).result.then(
      (resultado) => {
        if (resultado !== 'confirmar') return;
        this.separando.set(variante.key);
        this.mensajeExito.set(null);

        this.purchaseProductsService.unmerge(variante.key).subscribe({
          next: () => {
            this.separando.set(null);
            this.mensajeExito.set(`"${variante.name}" volvió a ser un producto aparte.`);
            this.cargar();
          },
          error: (err) => {
            this.separando.set(null);
            this.errorMessage.set(err.error?.error || 'Error al separar la variante.');
          }
        });
      },
      () => { /* Modal cerrado sin confirmar */ }
    );
  }

  // Abre "Unir manualmente" con este producto como principal
  queryUnir(): Params {
    const p = this.producto();
    return p ? { vista: 'manual', supplierId: p.supplierId, principal: p.key } : {};
  }
}
