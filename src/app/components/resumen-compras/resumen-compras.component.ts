import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportTotals } from '../../models/compras.model';

// Tarjetas del total de compras de un rango: el neto es la cifra principal
@Component({
  selector: 'app-resumen-compras',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="row g-3">
      <div class="col-6 col-lg-3">
        <div class="card border-secondary bg-dark-subtle shadow-sm h-100">
          <div class="card-body">
            <div class="text-secondary small fw-semibold text-uppercase mb-2"><i class="bi bi-cart-check me-1"></i> Total neto</div>
            <div class="fs-3 fw-bold text-light text-truncate">{{ datos.net.total | currency:'USD':'symbol':'1.2-2' }}</div>
            <div class="small text-secondary">Créditos fiscales − notas de crédito</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="card border-secondary bg-dark-subtle shadow-sm h-100">
          <div class="card-body">
            <div class="text-secondary small fw-semibold text-uppercase mb-2"><i class="bi bi-percent me-1"></i> Crédito fiscal de IVA</div>
            <div class="fs-3 fw-bold text-success text-truncate">{{ datos.net.ivaCredit | currency:'USD':'symbol':'1.2-2' }}</div>
            <div class="small text-secondary">
              IVA {{ datos.net.iva | currency:'USD':'symbol':'1.2-2' }} + percibido {{ datos.net.ivaPerceived | currency:'USD':'symbol':'1.2-2' }}
            </div>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="card border-secondary bg-dark-subtle shadow-sm h-100">
          <div class="card-body">
            <div class="text-secondary small fw-semibold text-uppercase mb-2"><i class="bi bi-receipt me-1"></i> Créditos fiscales</div>
            <div class="fs-3 fw-bold text-light">{{ datos.creditosFiscales.documents }}</div>
            <div class="small text-secondary">{{ datos.creditosFiscales.total | currency:'USD':'symbol':'1.2-2' }}</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="card border-secondary bg-dark-subtle shadow-sm h-100">
          <div class="card-body">
            <div class="text-secondary small fw-semibold text-uppercase mb-2"><i class="bi bi-receipt-cutoff me-1"></i> Notas de crédito</div>
            <div class="fs-3 fw-bold text-light">{{ datos.notasCredito.documents }}</div>
            <div class="small text-danger">{{ -datos.notasCredito.total | currency:'USD':'symbol':'1.2-2' }}</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResumenComprasComponent {
  @Input({ required: true }) datos!: ReportTotals;
}
