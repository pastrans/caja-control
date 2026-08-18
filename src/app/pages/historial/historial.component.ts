import { Component, OnInit, inject, TemplateRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CajaRecord, CashInOutRecord, TransactionRecord } from '../../models/caja.model';
import { NgbModal, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HistorialService } from '../../services/historial.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, NgbModalModule, NgbPaginationModule],
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

  abrirModal(modal: TemplateRef<unknown>, registro: CajaRecord): void {
    this.registroSeleccionado.set(registro);
    this.transaccionExpandida.set(null);
    this.modalService.open(modal, { size: 'lg', centered: true, scrollable: true });
  }

  toggleTransaccion(transaccion: TransactionRecord): void {
    if (this.transaccionExpandida() === transaccion) {
      this.transaccionExpandida.set(null);
    } else {
      this.transaccionExpandida.set(transaccion);
    }
  }
}