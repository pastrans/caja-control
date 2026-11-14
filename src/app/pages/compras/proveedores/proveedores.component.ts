import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { SuppliersService } from '../../../services/suppliers.service';
import { SupplierDTO } from '../../../models/compras.model';
import { FechaDtePipe } from '../../../pipes/compras.pipes';

// Solo lectura: los proveedores se crean y actualizan solos al importar DTE
@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbPaginationModule, FechaDtePipe],
  templateUrl: './proveedores.component.html'
})
export class ProveedoresComponent implements OnInit {
  private readonly suppliersService = inject(SuppliersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busqueda$ = new Subject<string>();

  // Estados reactivos
  proveedores = signal<SupplierDTO[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  busqueda = signal<string>('');

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  ngOnInit(): void {
    this.busqueda$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarProveedores(1));

    this.cargarProveedores();
  }

  onBuscar(texto: string): void {
    this.busqueda.set(texto);
    this.busqueda$.next(texto.trim());
  }

  cargarProveedores(page: number = this.currentPage()): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.suppliersService.getSuppliers(page, this.pageSize(), this.busqueda()).subscribe({
      next: (res) => {
        this.proveedores.set(res.items);
        this.currentPage.set(res.page);
        this.totalRecords.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al cargar los proveedores.');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(newPage: number): void {
    this.currentPage.set(newPage);
    this.cargarProveedores(newPage);
  }
}
