import { Component, inject, TemplateRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { MonedaBilletesComponent } from '../../components/moneda-billetes/moneda-billetes.component';
import { CajaService, OpenCajaPayload } from '../../services/caja.service';
import { AppValidators } from '../../utils/app-validators';

@Component({
  selector: 'app-abrir-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbModalModule, MonedaBilletesComponent],
  templateUrl: './abrir-caja.component.html',
  styleUrl: './abrir-caja.component.css'
})
export class AbrirCajaComponent implements OnInit {
  private readonly modalService = inject(NgbModal);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cajaService = inject(CajaService);

  cajaForm!: FormGroup;
  
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    // Verificar si ya existe una caja activa
    this.cajaService.getActiveCaja().subscribe({
      next: (cajaActiva) => {
        if (cajaActiva) {
          this.router.navigate(['/caja']);
        } else {
          this.initForm();
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.initForm();
        this.isLoading.set(false);
      }
    });
  }

  initForm(): void {
    this.cajaForm = this.fb.group({
      openingCash: [0.00, [ Validators.required, Validators.min( 0.01 ),Validators.pattern( AppValidators.amountFormat ) ] ],
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
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValues = this.cajaForm.value;
    
    // Mapeo al payload que espera la API
    const payload: OpenCajaPayload = {
      cash: Number(formValues.openingCash) || 0,
      note: formValues.openingNote || '',
      denominations: formValues.denominations
        .map((d: any) => ({ value: d.valor, quantity: d.cantidad }))
        .filter((d: any) => d.quantity > 0)
    };

    this.cajaService.openCaja(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/caja']);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Ocurrió un error al intentar abrir la caja.');
        this.isSubmitting.set(false);
      }
    });
  }

  descartar() {
    this.cajaForm.patchValue({ openingCash: (0.00).toFixed(2), openingNote: '' });
    this.denominationsFormArray.controls.forEach(ctrl => ctrl.get('cantidad')?.setValue(0));
  }
}