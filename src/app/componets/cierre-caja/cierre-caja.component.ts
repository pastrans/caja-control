import { Component, OnInit, inject, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CajaRecord, Closing } from '../../models/caja.model';
import { MonedaBilletesComponent } from '../moneda-billetes/moneda-billetes.component';

@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MonedaBilletesComponent],
  templateUrl: './cierre-caja.component.html',
  styles: ``
})
export class CierreCajaComponent implements OnInit {
  registerForm!: FormGroup;
  private modalService = inject(NgbModal);

  activeSession!: CajaRecord;
  openingAmount: number = 0;
  totalTransactionsCount: number = 0;
  totalTransactionsAmount: number = 0;
  totalInputsOutputs: number = 0;
  expectedCash: number = 0;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    const sessionData = localStorage.getItem('activeCaja');
    if (sessionData) {
      this.activeSession = JSON.parse(sessionData);
      
      this.openingAmount = this.activeSession.opening.cash || 0;
      
      this.totalTransactionsCount = this.activeSession.transactions?.length || 0;
      this.totalTransactionsAmount = (this.activeSession.transactions || []).reduce((sum, t) => sum + t.amountToCharge, 0);

      const inputs = (this.activeSession.cashInOut || []).filter(r => r.type === 'Entrada').reduce((sum, r) => sum + r.amount, 0);
      const outputs = (this.activeSession.cashInOut || []).filter(r => r.type === 'Salida').reduce((sum, r) => sum + r.amount, 0);
      this.totalInputsOutputs = inputs - outputs;
      
      this.expectedCash = this.openingAmount + this.totalTransactionsAmount + this.totalInputsOutputs;
    }

    this.registerForm = this.fb.group({
      cashCount: [this.expectedCash.toFixed(2), [Validators.required, Validators.min(0)]],
      closingNote: ['', [Validators.maxLength(250)]],
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

    // Validar nota cuando hay diferencia
    this.registerForm.get('cashCount')?.valueChanges.subscribe(() => {
      this.updateNoteValidation();
    });
    this.updateNoteValidation();
  }

  get denominationsFormArray(): FormArray {
    return this.registerForm.get('denominations') as FormArray;
  }

  get totalModal(): number {
    return this.denominationsFormArray.controls.reduce((acc, control) => {
      const valor = control.get('valor')?.value || 0;
      const cantidad = control.get('cantidad')?.value || 0;
      return acc + (valor * cantidad);
    }, 0);
  }

  get cashCount(): number {
    return Number(this.registerForm.get('cashCount')?.value) || 0;
  }

  get difference(): number {
    return this.cashCount - this.expectedCash;
  }

  get hasDifference(): boolean {
    return Math.abs(this.difference) > 0.01; // Usando 0.01 para evitar errores de precisión de coma flotante
  }

  updateNoteValidation(): void {
    const noteControl = this.registerForm.get('closingNote');
    if (this.hasDifference) {
      noteControl?.setValidators([Validators.required, Validators.maxLength(250)]);
    } else {
      noteControl?.setValidators([Validators.maxLength(250)]);
    }
    noteControl?.updateValueAndValidity({ emitEvent: false });
  }

  abrirModalBilletes(content: TemplateRef<any>) {
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  confirmarDesglose(modal: any) {
    this.registerForm.patchValue({ cashCount: this.totalModal.toFixed(2) });
    this.updateNoteValidation();
    modal.close();
  }

  limpiarEfectivo() {
    this.registerForm.patchValue({ cashCount: (0.00).toFixed(2) });
    this.denominationsFormArray.controls.forEach(ctrl => ctrl.get('cantidad')?.setValue(0));
    this.updateNoteValidation();
  }

  getAbs(val: number): number {
    return Math.abs(val);
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      if (this.activeSession) {
        const cashProvided = this.cashCount;
        
        const denominations = this.denominationsFormArray.controls
          .map(ctrl => ({
            valor: ctrl.get('valor')?.value || 0,
            cantidad: ctrl.get('cantidad')?.value || 0
          }))
          .filter(d => d.cantidad > 0);
        
        const closing: Closing = {
          date: new Date(),
          denominations: denominations,
          cashProvided: cashProvided,
          difference: this.difference
        };
        
        this.activeSession.closing = closing;
        
        const historialData = localStorage.getItem('historialCaja');
        let historial: CajaRecord[] = [];
        if (historialData) {
          historial = JSON.parse(historialData);
        }
        
        historial.push(this.activeSession);
        localStorage.setItem('historialCaja', JSON.stringify(historial));
        localStorage.removeItem('activeCaja');
      }

      this.activeModal.close('Close Register');
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}
