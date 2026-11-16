import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SuppliersService } from '../../../services/suppliers.service';
import { PurchaseReportsService } from '../../../services/purchase-reports.service';
import { PurchaseProductsService } from '../../../services/purchase-products.service';
import { IvaSummaryDTO, ProductReturnsReportDTO, PurchaseSummaryDTO, ReportRange, SupplierDTO } from '../../../models/compras.model';
import { FechaDtePipe, UnidadMedidaPipe } from '../../../pipes/compras.pipes';
import { NotaGuiaComponent } from '../../../components/nota-guia/nota-guia.component';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { SelectorRangoComponent } from '../../../components/selector-rango/selector-rango.component';
import { ResumenComprasComponent } from '../../../components/resumen-compras/resumen-compras.component';
import { GraficaMensualComponent, MetricaMensual } from '../../../components/grafica-mensual/grafica-mensual.component';

const ANIOS_SELECCIONABLES = 5;
const DEVOLUCIONES_POR_PAGINA = 10;
const PRODUCTOS_MAS_DEVUELTOS = 5;

@Component({
  selector: 'app-proveedor-detalle',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, NgbPaginationModule, FechaDtePipe, UnidadMedidaPipe,
    SelectorRangoComponent, ResumenComprasComponent, GraficaMensualComponent, NotaGuiaComponent
  ],
  templateUrl: './proveedor-detalle.component.html'
})
export class ProveedorDetalleComponent implements OnInit {
  private readonly suppliersService = inject(SuppliersService);
  private readonly purchaseReportsService = inject(PurchaseReportsService);
  private readonly purchaseProductsService = inject(PurchaseProductsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private supplierId = 0;

  // Proveedor
  proveedor = signal<SupplierDTO | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Totales del periodo
  resumen = signal<PurchaseSummaryDTO | null>(null);
  isLoadingResumen = signal<boolean>(false);
  errorResumen = signal<string | null>(null);

  // Devoluciones del periodo (mismo rango que los totales)
  devoluciones = signal<ProductReturnsReportDTO | null>(null);
  isLoadingDevoluciones = signal<boolean>(false);
  errorDevoluciones = signal<string | null>(null);
  paginaDevoluciones = signal<number>(1);
  readonly devolucionesPorPagina = DEVOLUCIONES_POR_PAGINA;
  readonly consejosDevoluciones = [
    'Cuentan por la fecha de la nota de crédito, en el mismo periodo que las compras de arriba.',
    'Solo devoluciones y rebajas de productos. Los descuentos por merma no cuentan aquí; siguen en los reportes de compras.',
    'El porcentaje es sobre lo comprado a este proveedor en el periodo, sin IVA.'
  ];

  productosMasDevueltos = computed(() => (this.devoluciones()?.products ?? []).slice(0, PRODUCTOS_MAS_DEVUELTOS));

  devolucionesVisibles = computed(() => {
    const inicio = (this.paginaDevoluciones() - 1) * DEVOLUCIONES_POR_PAGINA;
    return (this.devoluciones()?.items ?? []).slice(inicio, inicio + DEVOLUCIONES_POR_PAGINA);
  });

  // Compras por mes
  ivaSummary = signal<IvaSummaryDTO | null>(null);
  isLoadingMensual = signal<boolean>(false);
  errorMensual = signal<string | null>(null);
  metrica = signal<MetricaMensual>('total');
  anioActual = signal<number | null>(null); // Año en curso según el backend (primera respuesta)

  sinComprasEnRango = computed(() => {
    const r = this.resumen();
    return !!r && r.creditosFiscales.documents === 0 && r.notasCredito.documents === 0;
  });

  anios = computed(() => {
    const actual = this.anioActual();
    return actual ? Array.from({ length: ANIOS_SELECCIONABLES }, (_, i) => actual - i) : [];
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.supplierId = Number(params.get('id'));
        this.resumen.set(null);
        this.devoluciones.set(null);
        this.ivaSummary.set(null);
        this.anioActual.set(null);
        this.cargarProveedor();
        // Primera carga sin fechas ni año: el backend usa el periodo en curso
        this.cargarResumen();
        this.cargarMensual();
      });
  }

  cargarProveedor(): void {
    if (!Number.isInteger(this.supplierId) || this.supplierId <= 0) {
      this.errorMessage.set('El proveedor solicitado no existe.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.suppliersService.getSupplierById(this.supplierId).subscribe({
      next: (p) => {
        this.proveedor.set(p);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.proveedor.set(null);
        this.errorMessage.set(err.status === 404
          ? 'El proveedor solicitado no existe.'
          : err.error?.error || 'Error al cargar el proveedor.');
        this.isLoading.set(false);
      }
    });
  }

  cargarResumen(range: ReportRange = {}): void {
    this.isLoadingResumen.set(true);
    this.errorResumen.set(null);
    this.cargarDevoluciones(range);

    this.purchaseReportsService.getSummary(range, this.supplierId).subscribe({
      next: (res) => {
        this.resumen.set(res);
        this.isLoadingResumen.set(false);
      },
      error: (err) => {
        this.errorResumen.set(err.error?.error || 'Error al cargar las compras del periodo.');
        this.isLoadingResumen.set(false);
      }
    });
  }

  // Sin fechas usa el mes en curso, igual que el resumen: los dos responden con el mismo rango
  cargarDevoluciones(range: ReportRange = {}): void {
    this.isLoadingDevoluciones.set(true);
    this.errorDevoluciones.set(null);

    this.purchaseProductsService.getReturns(range, this.supplierId).subscribe({
      next: (res) => {
        this.devoluciones.set(res);
        this.paginaDevoluciones.set(1);
        this.isLoadingDevoluciones.set(false);
      },
      error: (err) => {
        this.errorDevoluciones.set(err.error?.error || 'Error al cargar las devoluciones del periodo.');
        this.isLoadingDevoluciones.set(false);
      }
    });
  }

  cargarMensual(year?: number): void {
    this.isLoadingMensual.set(true);
    this.errorMensual.set(null);

    this.purchaseReportsService.getIvaSummary(year, this.supplierId).subscribe({
      next: (res) => {
        this.ivaSummary.set(res);
        if (this.anioActual() === null) this.anioActual.set(res.year);
        this.isLoadingMensual.set(false);
      },
      error: (err) => {
        this.errorMensual.set(err.error?.error || 'Error al cargar las compras por mes.');
        this.isLoadingMensual.set(false);
      }
    });
  }
}
