import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SuppliersService } from '../../../services/suppliers.service';
import { PurchaseReportsService } from '../../../services/purchase-reports.service';
import { IvaSummaryDTO, PurchaseSummaryDTO, ReportRange, SupplierDTO } from '../../../models/compras.model';
import { FechaDtePipe } from '../../../pipes/compras.pipes';
import { SelectorRangoComponent } from '../../../components/selector-rango/selector-rango.component';
import { ResumenComprasComponent } from '../../../components/resumen-compras/resumen-compras.component';
import { GraficaMensualComponent, MetricaMensual } from '../../../components/grafica-mensual/grafica-mensual.component';

const ANIOS_SELECCIONABLES = 5;

@Component({
  selector: 'app-proveedor-detalle',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, FechaDtePipe,
    SelectorRangoComponent, ResumenComprasComponent, GraficaMensualComponent
  ],
  templateUrl: './proveedor-detalle.component.html'
})
export class ProveedorDetalleComponent implements OnInit {
  private readonly suppliersService = inject(SuppliersService);
  private readonly purchaseReportsService = inject(PurchaseReportsService);
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
