import { Component, inject, TemplateRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { MonedaBilletesComponent } from '../moneda-billetes/moneda-billetes.component';
import { CierreCajaComponent } from '../cierre-caja/cierre-caja.component';
import { SalidaEfectivoComponent } from '../salida-efectivo/salida-efectivo.component';
import { CajaRecord, CashInOutRecord, DenominationRecord } from '../../models/caja.model';
import { Empleado } from '../../models/empleado.model';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbModalModule, MonedaBilletesComponent],
  templateUrl: './caja.component.html',
  styles: ``
})
export class CajaComponent implements OnInit {

  private modalService = inject(NgbModal);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  cajaForm!: FormGroup;
  records: CajaRecord[] = [];
  cashRecords: CashInOutRecord[] = [];
  nextId = 1;
  nextCashId = 1;

  empleadas: Empleado[] = [
    { id: 1, nombre: 'Ana' },
    { id: 2, nombre: 'María' },
    { id: 3, nombre: 'Laura' },
    { id: 4, nombre: 'Sofía' }
  ];

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.cajaForm = this.fb.group({
      empleado: ['', Validators.required],
      nota: [''],
      amountToCharge: [0.00, [Validators.required, Validators.min(0.01)]],
      cashProvided: [0.00, [Validators.required, Validators.min(0)]],
      denominations: this.fb.array([
        this.fb.group({ valor: [100.00], cantidad: [0] }),
        this.fb.group({ valor: [50.00], cantidad: [0] }),
        this.fb.group({ valor: [20.00], cantidad: [0] }),
        this.fb.group({ valor: [10.00], cantidad: [0] }),
        this.fb.group({ valor: [5.00], cantidad: [0] }),
        this.fb.group({ valor: [1.00], cantidad: [0] }),
        this.fb.group({ valor: [0.25], cantidad: [0] }),
        this.fb.group({ valor: [0.10], cantidad: [0] }),
        this.fb.group({ valor: [0.05], cantidad: [0] }),
        this.fb.group({ valor: [0.01], cantidad: [0] })
      ])
    });
  }

  get denominationsFormArray(): FormArray {
    return this.cajaForm.get('denominations') as FormArray;
  }

  get totalModal(): number {
    return this.denominationsFormArray.controls.reduce((acc, control) => {
      const valor = control.get('valor')?.value || 0;
      const cantidad = control.get('cantidad')?.value || 0;
      return acc + (valor * cantidad);
    }, 0);
  }

  get amountToCharge() {
    return this.cajaForm.get('amountToCharge')?.value || 0;
  }

  get cashProvided() {
    return this.cajaForm.get('cashProvided')?.value || 0;
  }

  get changeReturned(): number {
    return Math.max(0, this.cashProvided - this.amountToCharge);
  }

  abrirModalBilletes(content: TemplateRef<any>) {
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  abrirModalCerrarCaja() {
    const modalRef = this.modalService.open(CierreCajaComponent, { centered: true, size: 'md' });
    modalRef.result.then((result) => {
      if (result && result === 'Close Register') {
        this.router.navigate(['/abrir-caja']);
      }
    }).catch(() => {
      // Modal descartado
    });
  }

  abrirModalCashInOut() {
    const modalRef = this.modalService.open(SalidaEfectivoComponent, { centered: true });
    modalRef.result.then((result) => {
      if (result) {
        this.cashRecords.unshift({
          id: this.nextCashId++,
          type: result.type,
          amount: result.amount,
          reason: result.reason,
          date: new Date()
        });
      }
    }).catch(() => {
      // Modal descartado
    });
  }

  confirmarDesglose(modal: any) {
    this.cajaForm.patchValue({ cashProvided: this.totalModal.toFixed(2) });
    modal.close();
  }

  limpiarEfectivo() {
    this.cajaForm.patchValue({ cashProvided: (0.00).toFixed(2) });
    this.denominationsFormArray.controls.forEach(ctrl => ctrl.get('cantidad')?.setValue(0));
  }

  selectedRecord: CajaRecord | null = null;

  verDetalles(record: CajaRecord, modal: TemplateRef<any>) {
    this.selectedRecord = record;
    this.modalService.open(modal, { centered: true, size: 'md' });
  }

  guardarCobro() {
    if (this.cajaForm.invalid) {
      alert('Por favor, completa todos los campos requeridos y asegúrate de que las cantidades sean válidas.');
      return;
    }

    if (this.cashProvided < this.amountToCharge) {
      alert('El efectivo entregado es menor a la cantidad a cobrar.');
      return;
    }

    const empleadoId = this.cajaForm.get('empleado')?.value;
    const empleadoObj = this.empleadas.find(e => e.id === Number(empleadoId));

    const denominations = this.denominationsFormArray.controls
      .map(ctrl => ({
        valor: ctrl.get('valor')?.value || 0,
        cantidad: ctrl.get('cantidad')?.value || 0
      }))
      .filter(d => d.cantidad > 0);

    const record: CajaRecord = {
      id: this.nextId++,
      date: new Date(),
      amountToCharge: this.amountToCharge,
      cashProvided: this.cashProvided,
      changeReturned: this.changeReturned,
      empleadoId: empleadoObj ? empleadoObj.id : 0,
      empleadoNombre: empleadoObj ? empleadoObj.nombre : 'Desconocido',
      nota: this.cajaForm.get('nota')?.value || '',
      denominations: denominations
    };

    this.records.unshift(record); // Añade al inicio de la tabla
    
    // Resetear formulario para siguiente cobro
    this.cajaForm.reset({
      empleado: '',
      nota: '',
      amountToCharge: 0.00,
      cashProvided: 0.00
    });
    this.denominationsFormArray.controls.forEach(ctrl => ctrl.get('cantidad')?.setValue(0));
  }

  descartar() {
    this.cajaForm.reset({
      empleado: '',
      nota: '',
      amountToCharge: 0.00,
      cashProvided: 0.00
    });
    this.denominationsFormArray.controls.forEach(ctrl => ctrl.get('cantidad')?.setValue(0));
  }
}
