import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { PurchaseReportsService } from '../../../services/purchase-reports.service';
import { BySupplierDTO, IvaSummaryDTO, PurchaseSummaryDTO, ReportRange } from '../../../models/compras.model';
import { MESES_LARGOS, indiceMes } from '../../../utils/compras.utils';
import { SelectorRangoComponent } from '../../../components/selector-rango/selector-rango.component';
import { ResumenComprasComponent } from '../../../components/resumen-compras/resumen-compras.component';
import { GraficaMensualComponent, MetricaMensual } from '../../../components/grafica-mensual/grafica-mensual.component';

type Vista = 'iva' | 'resumen' | 'proveedores';

const ANIOS_SELECCIONABLES = 5;

// Solo cuentan documentos activos; net (créditos fiscales − notas de crédito) es la cifra principal
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, NgbNavModule,
    SelectorRangoComponent, ResumenComprasComponent, GraficaMensualComponent
  ],
  templateUrl: './reportes.component.html'
})
export class ReportesComponent implements OnInit {
  private readonly purchaseReportsService = inject(PurchaseReportsService);

  vista = signal<Vista>('iva');

  // Resumen de IVA mensual
  ivaSummary = signal<IvaSummaryDTO | null>(null);
  isLoadingIva = signal<boolean>(false);
  errorIva = signal<string | null>(null);
  metrica = signal<MetricaMensual>('total');
  anioActual = signal<number | null>(null); // Año en curso según el backend (primera respuesta)

  // Total de compras y por proveedor: comparten el rango
  resumen = signal<PurchaseSummaryDTO | null>(null);
  porProveedor = signal<BySupplierDTO | null>(null);
  isLoadingResumen = signal<boolean>(false);
  isLoadingProveedores = signal<boolean>(false);
  errorRango = signal<string | null>(null);

  anios = computed(() => {
    const actual = this.anioActual();
    return actual ? Array.from({ length: ANIOS_SELECCIONABLES }, (_, i) => actual - i) : [];
  });

  // Rango aplicado según la respuesta (en la primera carga lo calcula el backend)
  rangoAplicado = computed(() => {
    const r = this.resumen() ?? this.porProveedor();
    return { from: r?.from ?? '', to: r?.to ?? '' };
  });

  ngOnInit(): void {
    // Primera carga sin año ni fechas: el backend usa el periodo en curso
    this.cargarIva();
    this.cargarRango();
  }

  cargarIva(year?: number): void {
    this.isLoadingIva.set(true);
    this.errorIva.set(null);

    this.purchaseReportsService.getIvaSummary(year).subscribe({
      next: (res) => {
        this.ivaSummary.set(res);
        if (this.anioActual() === null) this.anioActual.set(res.year);
        this.isLoadingIva.set(false);
      },
      error: (err) => {
        this.errorIva.set(err.error?.error || 'Error al cargar el resumen de IVA.');
        this.isLoadingIva.set(false);
      }
    });
  }

  cargarRango(range: ReportRange = {}): void {
    this.errorRango.set(null);
    this.isLoadingResumen.set(true);
    this.isLoadingProveedores.set(true);

    this.purchaseReportsService.getSummary(range).subscribe({
      next: (res) => {
        this.resumen.set(res);
        this.isLoadingResumen.set(false);
      },
      error: (err) => {
        this.errorRango.set(err.error?.error || 'Error al cargar el total de compras.');
        this.isLoadingResumen.set(false);
      }
    });

    this.purchaseReportsService.getBySupplier(range).subscribe({
      next: (res) => {
        this.porProveedor.set(res);
        this.isLoadingProveedores.set(false);
      },
      error: (err) => {
        this.errorRango.set(err.error?.error || 'Error al cargar las compras por proveedor.');
        this.isLoadingProveedores.set(false);
      }
    });
  }

  refrescar(): void {
    this.cargarIva(this.ivaSummary()?.year);
    const { from, to } = this.rangoAplicado();
    this.cargarRango(from && to ? { from, to } : {});
  }

  nombreMes(mes: string): string {
    return MESES_LARGOS[indiceMes(mes)];
  }
}
