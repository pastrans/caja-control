import { Component, OnInit, inject, TemplateRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CajaRecord, CashInOutRecord, TransactionRecord } from '../../models/caja.model';
import { NgbModal, NgbModalModule, NgbPaginationModule, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { HistorialService } from '../../services/historial.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, NgbModalModule, NgbPaginationModule, NgbPopoverModule],
  templateUrl: './historial.component.html'
})
export class HistorialComponent implements OnInit {
  private readonly historialService = inject(HistorialService);
  private readonly modalService = inject(NgbModal);

  // Estados reactivos
  historial = signal<CajaRecord[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  // Modales
  registroSeleccionado = signal<CajaRecord | null>(null);
  transaccionExpandida = signal<TransactionRecord | null>(null);
  isLoadingDetalle = signal<boolean>(false);
  errorDetalle = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(page: number = this.currentPage()): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.historialService.getHistorial(page, this.pageSize()).subscribe({
      next: (res) => {
        this.historial.set(res.items);
        this.currentPage.set(res.page);
        this.totalRecords.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar el historial de cajas.');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(newPage: number): void {
    this.currentPage.set(newPage);
    this.cargarHistorial(newPage);
  }

  calcularTotal(movimientos: CashInOutRecord[] | undefined, tipo: 'Entrada' | 'Salida'): number {
    if (!movimientos || movimientos.length === 0) return 0;
    return movimientos.filter(m => m.type === tipo).reduce((sum, m) => sum + m.amount, 0);
  }
  calcularTotalTransacciones(transacciones: TransactionRecord[] | undefined): number {
    if (!transacciones || transacciones.length === 0) return 0;
    return transacciones.reduce((sum, t) => sum + t.amountToCharge, 0);
  }

  abrirModal(modal: TemplateRef<unknown>, registro: CajaRecord): void {
    this.registroSeleccionado.set(registro);
    this.transaccionExpandida.set(null);
    this.errorDetalle.set(null);
    this.isLoadingDetalle.set(true);
    this.modalService.open(modal, { size: 'lg', centered: true, scrollable: true });

    // El listado solo trae el resumen; las transacciones y movimientos se cargan al abrir el modal
    this.historialService.getCajaById(registro.id).subscribe({
      next: (detalle) => {
        if (this.registroSeleccionado()?.id === registro.id) {
          this.registroSeleccionado.set(detalle);
        }
        this.isLoadingDetalle.set(false);
      },
      error: (err) => {
        this.errorDetalle.set(err.error?.error || 'Error al cargar el detalle de la caja.');
        this.isLoadingDetalle.set(false);
      }
    });
  }

  toggleTransaccion(transaccion: TransactionRecord): void {
    if (this.transaccionExpandida() === transaccion) {
      this.transaccionExpandida.set(null);
    } else {
      this.transaccionExpandida.set(transaccion);
    }
  }
}