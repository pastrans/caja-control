import { Component, OnInit, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CajaService, CashInOutPayload } from '../../services/caja.service';

@Component({
  selector: 'app-salida-efectivo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './salida-efectivo.component.html'
})
export class SalidaEfectivoComponent implements OnInit {
  @Input() cashRegisterRecordId!: number; // Recibido desde CajaComponent
  
  public activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private cajaService = inject(CajaService);

  cashInOutForm!: FormGroup;
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.cashInOutForm = this.fb.group({
      type: ['IN', Validators.required],
      amount: [null, [
        Validators.required, 
        Validators.min(0.01),
        Validators.pattern(/^\d+(\.\d{1,2})?$/) // 👈 Solo permite hasta 2 decimales
      ]],
      reason: ['', Validators.required] // Hecho obligatorio por consistencia
    });
  }

  onSubmit(): void {
    if (this.cashInOutForm.invalid) {
      this.cashInOutForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValues = this.cashInOutForm.value;
    const payload: CashInOutPayload = {
      cashRegisterRecordId: this.cashRegisterRecordId,
      type: formValues.type,
      amount: Number(formValues.amount),
      reason: formValues.reason
    };

    this.cajaService.registerCashInOut(payload).subscribe({
      next: (newRecord) => {
        this.activeModal.close(newRecord);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al guardar el registro.');
        this.isSubmitting.set(false);
      }
    });
  }
}