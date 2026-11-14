import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportRange } from '../../models/compras.model';

// Rango de fechas de los reportes de compras. "Mes en curso" emite un rango vacío:
// el backend calcula el mes con la zona del negocio y la respuesta trae las fechas aplicadas
@Component({
  selector: 'app-selector-rango',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="d-flex flex-wrap align-items-center gap-2">
      <div class="d-flex align-items-center gap-1">
        <input type="date" class="form-control form-control-sm" aria-label="Desde"
               [max]="to" [disabled]="disabled"
               [ngModel]="from" (ngModelChange)="cambiar($event, to)">
        <span class="text-secondary small">a</span>
        <input type="date" class="form-control form-control-sm" aria-label="Hasta"
               [min]="from" [disabled]="disabled"
               [ngModel]="to" (ngModelChange)="cambiar(from, $event)">
      </div>
      <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="disabled" (click)="rangoChange.emit({})">
        Mes en curso
      </button>
    </div>
  `
})
export class SelectorRangoComponent {
  @Input() from = '';
  @Input() to = '';
  @Input() disabled = false;
  @Output() rangoChange = new EventEmitter<ReportRange>();

  cambiar(from: string, to: string): void {
    // Ignora estados intermedios (fecha borrada o desde > hasta)
    if (!from || !to || from > to) return;
    this.rangoChange.emit({ from, to });
  }
}
