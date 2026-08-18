import { Component, OnInit, TemplateRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbModal, NgbModalModule, NgbModalRef, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Empleado } from '../../models/empleado.model';
import { EmpleadosService } from '../../services/empleados.service';

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbModalModule, NgbPaginationModule],
  templateUrl: './empleados.component.html'
})
export class EmpleadosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly modalService = inject(NgbModal);
  private readonly empleadosService = inject(EmpleadosService);

  // Estados Reactivos
  empleados = signal<Empleado[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  // Filtros: 'todos' | 'habilitados' | 'inhabilitados'
  filtroEstado = signal<'todos' | 'habilitados' | 'inhabilitados'>('todos');

  empleadosFiltrados = computed(() => {
    const lista = this.empleados();
    const filtro = this.filtroEstado();
    if (filtro === 'habilitados') return lista.filter(e => e.habilitado);
    if (filtro === 'inhabilitados') return lista.filter(e => !e.habilitado);
    return lista;
  });

  // Modal y Formulario
  isEditMode = false;
  currentEmpleadoId: number | null = null;
  modalRef: NgbModalRef | null = null;

  empleadoForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]]
  });

  ngOnInit(): void {
    this.cargarEmpleados();
  }

  cargarEmpleados(page: number = this.currentPage()): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.empleadosService.getEmpleados(page, this.pageSize()).subscribe({
      next: (res) => {
        this.empleados.set(res.empleados);
        this.currentPage.set(res.page);
        this.totalRecords.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar empleados.');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(newPage: number): void {
    this.currentPage.set(newPage);
    this.cargarEmpleados(newPage);
  }

  setFiltro(estado: 'todos' | 'habilitados' | 'inhabilitados'): void {
    this.filtroEstado.set(estado);
  }

  openModal(content: TemplateRef<unknown>, empleado?: Empleado): void {
    this.isEditMode = !!empleado;
    this.errorMessage.set(null);

    if (empleado) {
      this.currentEmpleadoId = empleado.id;
      this.empleadoForm.patchValue({
        nombre: empleado.nombre
      });
    } else {
      this.currentEmpleadoId = null;
      this.empleadoForm.reset({
        nombre: ''
      });
    }
    this.modalRef = this.modalService.open(content, { centered: true });
  }

  onSubmit(): void {
    if (this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched();
      return;
    }

    const { nombre } = this.empleadoForm.value;
    this.isLoading.set(true);

    if (this.isEditMode && this.currentEmpleadoId !== null) {
      this.empleadosService.updateEmpleado(this.currentEmpleadoId, nombre).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.modalRef?.close();
          this.cargarEmpleados();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Error al actualizar empleado.');
          this.isLoading.set(false);
        }
      });
    } else {
      this.empleadosService.createEmpleado(nombre).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.modalRef?.close();
          this.cargarEmpleados(1);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Error al crear empleado.');
          this.isLoading.set(false);
        }
      });
    }
  }

  onDelete(id: number): void {
    if (confirm('¿Está seguro de que desea eliminar este empleado?')) {
      this.isLoading.set(true);
      this.empleadosService.deleteEmpleado(id).subscribe({
        next: () => this.cargarEmpleados(),
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Error al eliminar empleado.');
          this.isLoading.set(false);
        }
      });
    }
  }
}