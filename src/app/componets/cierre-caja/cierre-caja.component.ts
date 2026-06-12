import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cierre-caja.component.html',
  styles: ``
})
export class CierreCajaComponent implements OnInit {
  registerForm!: FormGroup;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      cashCount: ['2611.57', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      closingNote: ['', [Validators.maxLength(250)]]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.activeModal.close('Close Register');
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}
