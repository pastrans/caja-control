import { Component, OnInit, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
}

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './empleados.component.html',
})
export class EmpleadosComponent implements OnInit {
  empleados: Empleado[] = [
    { id: 1, nombre: 'Juan', apellido: 'Perez', telefono: '123456789' },
    { id: 2, nombre: 'Maria', apellido: 'Gomez', telefono: '987654321' },
  ];
  empleadoForm: FormGroup;
  isEditMode = false;
  currentEmpleadoId: number | null = null;
  modalRef: NgbModalRef | null = null;

  constructor(private fb: FormBuilder, private modalService: NgbModal) {
    this.empleadoForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
    });
  }

  ngOnInit(): void {}

  openModal(content: TemplateRef<any>, empleado?: Empleado) {
    this.isEditMode = !!empleado;
    if (empleado) {
      this.currentEmpleadoId = empleado.id;
      this.empleadoForm.setValue({
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        telefono: empleado.telefono,
      });
    } else {
      this.empleadoForm.reset();
      this.currentEmpleadoId = null;
    }
    this.modalRef = this.modalService.open(content, { centered: true });
  }

  onSubmit() {
    if (this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched();
      return;
    }

    if (this.isEditMode && this.currentEmpleadoId !== null) {
      // Edit
      const index = this.empleados.findIndex(e => e.id === this.currentEmpleadoId);
      if (index !== -1) {
        this.empleados[index] = { id: this.currentEmpleadoId, ...this.empleadoForm.value };
      }
    } else {
      // Add
      const newId = this.empleados.length > 0 ? Math.max(...this.empleados.map(e => e.id)) + 1 : 1;
      this.empleados.push({ id: newId, ...this.empleadoForm.value });
    }

    this.modalRef?.close();
  }

  onDelete(id: number) {
    if (confirm('¿Está seguro de que desea eliminar este empleado?')) {
      this.empleados = this.empleados.filter(e => e.id !== id);
    }
  }
}