import { Component, OnInit, inject, Input, signal, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CajaRecord } from '../../models/caja.model';
import { MonedaBilletesComponent } from '../moneda-billetes/moneda-billetes.component';
import { CajaService, CloseCajaPayload } from '../../services/caja.service';
import { AppValidators } from '../../utils/app-validators';
import { DenominationsUtils } from '../../utils/denominations.utils';

@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MonedaBilletesComponent],
  templateUrl: './cierre-caja.component.html'
})
export class CierreCajaComponent implements OnInit {
  @Input() activeSession!: CajaRecord; 
  
  public activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private modalService = inject(NgbModal);
  private cajaService = inject(CajaService);

  registerForm!: FormGroup;
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  openingAmount: number = 0;
  totalTransactionsCount: number = 0;
  totalTransactionsAmount: number = 0;
  totalInputsOutputs: number = 0;
  expectedCash: number = 0;

  ngOnInit(): void {
    if (this.activeSession) {
      this.openingAmount = this.activeSession.opening.cash || 0;
      this.totalTransactionsCount = this.activeSession.transactions?.length || 0;
      this.totalTransactionsAmount = (this.activeSession.transactions || []).reduce((sum, t) => sum + t.amountToCharge, 0);

      const inputs = (this.activeSession.cashInOut || []).filter(r => r.type === 'Entrada').reduce((sum, r) => sum + r.amount, 0);
      const outputs = (this.activeSession.cashInOut || []).filter(r => r.type === 'Salida').reduce((sum, r) => sum + r.amount, 0);
      this.totalInputsOutputs = inputs - outputs;
      
      this.expectedCash = this.openingAmount + this.totalTransactionsAmount + this.totalInputsOutputs;
    }

    this.registerForm = this.fb.group({
      cashCount: [this.expectedCash.toFixed(2), [ Validators.required, Validators.min(0.01), Validators.pattern(AppValidators.amountFormat) ] ],
      closingNote: ['', [Validators.maxLength(250)]],
      denominations: DenominationsUtils.build(this.fb)
    });

    this.registerForm.get('cashCount')?.valueChanges.subscribe(() => {
      DenominationsUtils.clear(this.denominationsFormArray); 
      this.updateNoteValidation(); 
    });

    this.updateNoteValidation();
  }

  get denominationsFormArray(): FormArray { return this.registerForm.get('denominations') as FormArray; }
  get totalModal(): number {
    return this.denominationsFormArray.controls.reduce((acc, control) => acc + ((control.value.valor || 0) * (control.value.cantidad || 0)), 0);
  }
  get cashCount(): number { return Number(this.registerForm.get('cashCount')?.value) || 0; }
  get difference(): number { return this.cashCount - this.expectedCash; }
  get hasDifference(): boolean { return Math.abs(this.difference) > 0.01; }
  getAbs(val: number): number { return Math.abs(val); }

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
    this.modalService.open(content, { centered: true, size: 'lg' }).result.then(
        () => {},
        () => {
          DenominationsUtils.clear(this.denominationsFormArray);
        }
      );
  }

  confirmarDesglose(modal: any) {
    this.registerForm.patchValue(
      { cashCount: this.totalModal.toFixed(2) },
      { emitEvent: false }
    );
    this.updateNoteValidation(); 
    modal.close('Confirmed');
  }

  limpiarEfectivo() {
    this.registerForm.patchValue({ cashCount: (0.00).toFixed(2) });
    DenominationsUtils.clear(this.denominationsFormArray);
    this.updateNoteValidation();
  }

  // NUEVO: Método que lanza el modal de confirmación antes del envío
  abrirConfirmacion(content: TemplateRef<any>): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    // Usamos backdrop: 'static' para que no se cierre por error al hacer click afuera
    this.modalService.open(content, { centered: true, backdrop: 'static' }).result.then(
      (result) => {
        if (result === 'Confirmar') {
          this.onSubmit();
        }
      },
      () => { /* Se canceló el segundo modal, no hacemos nada */ }
    );
  }

  onSubmit(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: CloseCajaPayload = {
      cashRegisterRecordId: this.activeSession.id,
      totalTransactions: Number(this.totalTransactionsAmount.toFixed(2)),
      totalCashInOut: Number(this.totalInputsOutputs.toFixed(2)),
      totalExpected: Number(this.expectedCash.toFixed(2)),
      cashProvided: Number(this.cashCount.toFixed(2)),
      difference: Number(this.difference.toFixed(2)),
      note: this.registerForm.value.closingNote?.trim() || null as any,
      denominations: this.registerForm.value.denominations
        .filter((d: any) => d.cantidad > 0)
        .map((d: any) => ({ value: d.valor, quantity: d.cantidad }))
    };

    this.cajaService.closeCaja(payload).subscribe({
      next: () => {
        // Cierra el modal principal de cierre
        this.activeModal.close('Close Register');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al intentar cerrar la caja.');
        this.isSubmitting.set(false);
      }
    });
  }
}