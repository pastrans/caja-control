import { Component, inject, TemplateRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { MonedaBilletesComponent } from '../../components/moneda-billetes/moneda-billetes.component';
import { CajaRecord } from '../../models/caja.model';

@Component({
  selector: 'app-abrir-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbModalModule, MonedaBilletesComponent],
  templateUrl: './abrir-caja.component.html',
  styleUrl: './abrir-caja.component.css'
})
export class AbrirCajaComponent implements OnInit {

  private modalService = inject(NgbModal);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  cajaForm!: FormGroup;

  ngOnInit() {
    // If active session exists, go directly to caja
    if (localStorage.getItem('activeCaja')) {
      this.router.navigate(['/caja']);
      return;
    }

    this.cajaForm = this.fb.group({
      openingCash: [0.00],
      openingNote: [''],
      denominations: this.fb.array([
        this.fb.group({ valor: [100.00], cantidad: [0] }),
        this.fb.group({ valor: [1.00], cantidad: [0] }),
        this.fb.group({ valor: [50.00], cantidad: [0] }),
        this.fb.group({ valor: [0.25], cantidad: [0] }),
        this.fb.group({ valor: [20.00], cantidad: [0] }),
        this.fb.group({ valor: [0.10], cantidad: [0] }),
        this.fb.group({ valor: [10.00], cantidad: [0] }),
        this.fb.group({ valor: [0.05], cantidad: [0] }),
        this.fb.group({ valor: [5.00], cantidad: [0] }),
        this.fb.group({ valor: [0.01], cantidad: [0] })
      ])
    });
  }

  get denominationsFormArray(): FormArray {
    return this.cajaForm.get('denominations') as FormArray;
  }

  // Calcula el total acumulado en tiempo real dentro del modal
  get totalModal(): number {
    return this.denominationsFormArray.controls.reduce((acc, control) => {
      const valor = control.get('valor')?.value || 0;
      const cantidad = control.get('cantidad')?.value || 0;
      return acc + (valor * cantidad);
    }, 0);
  }

  abrirModalBilletes(content: TemplateRef<any>) {
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  confirmarDesglose(modal: any) {
    this.cajaForm.patchValue({ openingCash: this.totalModal.toFixed(2) });
    modal.close();
  }

  limpiarEfectivo() {
    this.cajaForm.patchValue({ openingCash: (0.00).toFixed(2) });
    this.denominationsFormArray.controls.forEach(ctrl => ctrl.get('cantidad')?.setValue(0));
  }

  guardarApertura() {
    const denominations = this.denominationsFormArray.controls
      .map(ctrl => ({
        valor: ctrl.get('valor')?.value || 0,
        cantidad: ctrl.get('cantidad')?.value || 0
      }))
      .filter(d => d.cantidad > 0);

    const session: CajaRecord = {
      id: Date.now(),
      status: 'OPEN',
      opening: {
        date: new Date(),
        denominations: denominations,
        cash: Number(this.cajaForm.get('openingCash')?.value) || 0,
        note: this.cajaForm.get('openingNote')?.value || ''
      },
      transactions: [],
      cashInOut: []
    };

    localStorage.setItem('activeCaja', JSON.stringify(session));
    this.router.navigate(['/caja']);
  }

  descartar() {
    this.cajaForm.patchValue({ openingCash: (0.00).toFixed(2), openingNote: '' });
    this.denominationsFormArray.controls.forEach(ctrl => ctrl.get('cantidad')?.setValue(0));
  }
}
