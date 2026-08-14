import { Component, OnInit, inject, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { Usuario, RolUsuario } from '../../models/usuario.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbModalModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  private modalService = inject(NgbModal);
  private fb = inject(FormBuilder);

  usuarios: Usuario[] = [];
  usuarioForm!: FormGroup;
  roles: RolUsuario[] = ['Admin', 'Cajero'];
  isEditMode = false;
  usuarioSeleccionado: Usuario | null = null;

  ngOnInit(): void {
    this.loadUsers();
    this.initForm();
  }

  initForm(): void {
    this.usuarioForm = this.fb.group({
      id: [null],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(6)]],
      role: ['Cajero', Validators.required]
    });
  }

  loadUsers(): void {
    // En una aplicación real, esto vendría de un servicio.
    const usersData = localStorage.getItem('usuarios');
    if (usersData) {
      this.usuarios = JSON.parse(usersData);
    } else {
      // Datos de ejemplo si no hay nada en localStorage
      this.usuarios = [
        { id: 1, nombre: 'Admin User', correo: 'admin@example.com', contrasena: 'password', role: 'Admin' },
        { id: 2, nombre: 'Cajero User', correo: 'cajero@example.com', contrasena: 'password', role: 'Cajero' }
      ];
      this.saveUsers();
    }
  }

  saveUsers(): void {
    localStorage.setItem('usuarios', JSON.stringify(this.usuarios));
  }

  openModal(content: TemplateRef<any>, usuario?: Usuario): void {
    this.isEditMode = !!usuario;
    this.initForm();
    if (usuario) {
      this.usuarioSeleccionado = usuario;
      this.usuarioForm.patchValue(usuario);
      // La contraseña no es obligatoria al editar
      this.usuarioForm.get('contrasena')?.clearValidators();
      this.usuarioForm.get('contrasena')?.updateValueAndValidity();
    } else {
      this.usuarioSeleccionado = null;
      this.usuarioForm.get('contrasena')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.usuarioForm.get('contrasena')?.updateValueAndValidity();
    }
    this.modalService.open(content, { centered: true });
  }

  guardarUsuario(modal: any): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    const formValue = this.usuarioForm.value;

    if (this.isEditMode && this.usuarioSeleccionado) {
      // Editar usuario
      const index = this.usuarios.findIndex(u => u.id === this.usuarioSeleccionado!.id);
      if (index > -1) {
        const updatedUser = { ...this.usuarios[index], ...formValue };
        // No actualizar contraseña si no se ingresó una nueva
        if (!formValue.contrasena) {
          updatedUser.contrasena = this.usuarios[index].contrasena;
        }
        this.usuarios[index] = updatedUser;
      }
    } else {
      // Crear nuevo usuario
      const nuevoUsuario: Usuario = {
        ...formValue,
        id: this.usuarios.length > 0 ? Math.max(...this.usuarios.map(u => u.id)) + 1 : 1,
      };
      this.usuarios.push(nuevoUsuario);
    }

    this.saveUsers();
    modal.close();
  }

  eliminarUsuario(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      this.usuarios = this.usuarios.filter(u => u.id !== id);
      this.saveUsers();
    }
  }
}