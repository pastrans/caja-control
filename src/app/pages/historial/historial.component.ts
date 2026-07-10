import { Component, OnInit, inject, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CajaRecord, CashInOutRecord, TransactionRecord } from '../../models/caja.model';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, NgbModalModule],
  templateUrl: './historial.component.html',
  styles: ``
})
export class HistorialComponent implements OnInit {
  historial: CajaRecord[] = [];
  registroSeleccionado: CajaRecord | null = null;
  transaccionExpandida: TransactionRecord | null = null;
  private modalService = inject(NgbModal);

  constructor() {}

  ngOnInit(): void {
    const historialGuardado = localStorage.getItem('historialCaja');
    if (historialGuardado) {
      const historialRaw: CajaRecord[] = JSON.parse(historialGuardado);
      // Convertir las cadenas de fecha a objetos Date
      this.historial = historialRaw.map(registro => {
        registro.opening.date = new Date(registro.opening.date);
        if (registro.closing) {
          registro.closing.date = new Date(registro.closing.date);
        }
        (registro.transactions || []).forEach(t => t.date = new Date(t.date));
        (registro.cashInOut || []).forEach(m => m.date = new Date(m.date));
        return registro;
      });
    }
  }

  calcularTotal(movimientos: CashInOutRecord[], tipo: 'Entrada' | 'Salida'): number {
    if (!movimientos) {
      return 0;
    }
    return movimientos.filter(m => m.type === tipo)
                      .reduce((sum, m) => sum + m.amount, 0);
  }

  abrirModal(modal: TemplateRef<any>, registro: CajaRecord) {
    this.registroSeleccionado = registro;
    this.transaccionExpandida = null; // Reset expanded transaction on modal open
    this.modalService.open(modal, { size: 'lg', centered: true });
  }

  toggleTransaccion(transaccion: TransactionRecord) {
    if (this.transaccionExpandida === transaccion) {
      this.transaccionExpandida = null;
    } else {
      this.transaccionExpandida = transaccion;
    }
  }
}
