import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-salida-efectivo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './salida-efectivo.component.html',
  styles: ``
})
export class SalidaEfectivoComponent implements OnInit {
  cashInOutForm!: FormGroup;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.cashInOutForm = this.fb.group({
      type: ['Entrada', Validators.required],
      amount: [0.00, [Validators.required, Validators.min(0.01)]],
      reason: [''] // El motivo no es obligatorio
    });
  }

  onSubmit(): void {
    if (this.cashInOutForm.valid) {
      this.activeModal.close(this.cashInOutForm.value);
    } else {
      this.cashInOutForm.markAllAsTouched();
    }
  }
}
