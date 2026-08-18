import { Component, OnInit, inject, TemplateRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbModalModule, NgbModalRef, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Usuario, RolUsuario } from '../../models/usuario.model';
import { UsuariosService } from '../../services/usuarios.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbModalModule, NgbPaginationModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  private readonly modalService = inject(NgbModal);
  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(UsuariosService);

  // Estados Reactivos
  usuarios = signal<Usuario[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  // Filtros de estado
  filtroEstado = signal<'todos' | 'habilitados' | 'inhabilitados'>('todos');

  usuariosFiltrados = computed(() => {
    const lista = this.usuarios();
    const filtro = this.filtroEstado();
    if (filtro === 'habilitados') return lista.filter(u => u.habilitado);
    if (filtro === 'inhabilitados') return lista.filter(u => !u.habilitado);
    return lista;
  });

  // Modal y Formulario Inicializado de inmediato
  roles: RolUsuario[] = ['Admin', 'Cajero'];
  isEditMode = false;
  usuarioSeleccionado: Usuario | null = null;
  modalRef: NgbModalRef | null = null;

  usuarioForm: FormGroup = this.fb.group({
    id: [null],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Cajero' as RolUsuario, Validators.required],
    habilitado: [true]
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(page: number = this.currentPage()): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.usuariosService.getUsuarios(page, this.pageSize()).subscribe({
      next: (res) => {
        this.usuarios.set(res.items);
        this.currentPage.set(res.page);
        this.totalRecords.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cargar usuarios.');
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(newPage: number): void {
    this.currentPage.set(newPage);
    this.cargarUsuarios(newPage);
  }

  setFiltro(estado: 'todos' | 'habilitados' | 'inhabilitados'): void {
    this.filtroEstado.set(estado);
  }

  openModal(content: TemplateRef<unknown>, usuario?: Usuario): void {
    this.isEditMode = !!usuario;
    this.errorMessage.set(null);

    if (usuario) {
      this.usuarioSeleccionado = usuario;
      this.usuarioForm.patchValue({
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        role: usuario.role,
        habilitado: usuario.habilitado,
        contrasena: ''
      });
      this.usuarioForm.get('contrasena')?.clearValidators();
      this.usuarioForm.get('contrasena')?.updateValueAndValidity();
    } else {
      this.usuarioSeleccionado = null;
      this.usuarioForm.reset({
        id: null,
        nombre: '',
        correo: '',
        contrasena: '',
        role: 'Cajero',
        habilitado: true
      });
      this.usuarioForm.get('contrasena')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.usuarioForm.get('contrasena')?.updateValueAndValidity();
    }

    this.modalRef = this.modalService.open(content, { centered: true });
  }

  guardarUsuario(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    if (this.isEditMode && this.usuarioSeleccionado) {
      this.usuariosService.updateUsuario(this.usuarioSeleccionado.id, this.usuarioForm.value).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.modalRef?.close();
          this.cargarUsuarios();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Error al actualizar usuario.');
          this.isLoading.set(false);
        }
      });
    } else {
      this.usuariosService.createUsuario(this.usuarioForm.value).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.modalRef?.close();
          this.cargarUsuarios(1);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Error al crear usuario.');
          this.isLoading.set(false);
        }
      });
    }
  }

  eliminarUsuario(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.isLoading.set(true);
      this.usuariosService.deleteUsuario(id).subscribe({
        next: () => this.cargarUsuarios(),
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Error al eliminar usuario.');
          this.isLoading.set(false);
        }
      });
    }
  }
}