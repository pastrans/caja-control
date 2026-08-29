import { Component, inject, TemplateRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { MonedaBilletesComponent } from '../../components/moneda-billetes/moneda-billetes.component';
import { CierreCajaComponent } from '../../components/cierre-caja/cierre-caja.component';
import { SalidaEfectivoComponent } from '../../components/salida-efectivo/salida-efectivo.component';
import { CajaRecord, CashInOutRecord, TransactionRecord } from '../../models/caja.model';
import { Empleado } from '../../models/empleado.model';
import { CajaService, TransactionPayload } from '../../services/caja.service';
import { EmpleadosService } from '../../services/empleados.service';
import { AppValidators } from '../../utils/app-validators';
import { DenominationsUtils } from '../../utils/denominations.utils';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbModalModule, MonedaBilletesComponent],
  templateUrl: './caja.component.html'
})
export class CajaComponent implements OnInit {
  private readonly modalService = inject(NgbModal);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cajaService = inject(CajaService);
  private readonly empleadosService = inject(EmpleadosService);

  cajaForm!: FormGroup;
  
  // Estados de UI
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Datos de la sesión
  activeSession: CajaRecord | null = null;
  records: TransactionRecord[] = [];
  cashRecords: CashInOutRecord[] = [];
  empleadas: Empleado[] = [];
  selectedRecord: TransactionRecord | null = null;

  ngOnInit() {
    this.cargarEmpleados();
    this.verificarCajaActiva();
  }

  cargarEmpleados() {
    // Cargamos empleados activos (100 como límite temporal para el select)
    this.empleadosService.getEmpleados(1, 100).subscribe(res => {
      this.empleadas = res.empleados.filter(e => e.habilitado);
    });
  }

  verificarCajaActiva() {
    this.cajaService.getActiveCaja().subscribe({
      next: (caja) => {
        if (!caja) {
          this.router.navigate(['/abrir-caja']);
          return;
        }
        
        this.activeSession = caja;
        // Ordenamos descendente para ver lo más reciente arriba
        this.records = [...(caja.transactions || [])].sort((a, b) => b.date.getTime() - a.date.getTime());
        this.cashRecords = [...(caja.cashInOut || [])].sort((a, b) => b.date.getTime() - a.date.getTime());
        
        this.initForm();
        this.isLoading.set(false);
      },
      error: () => {
        this.router.navigate(['/abrir-caja']);
      }
    });
  }

  initForm() {
    this.cajaForm = this.fb.group({
      empleado: ['', Validators.required],
      nota: [''],
      amountToCharge: [null, [ Validators.required, Validators.min( 0.01 ),Validators.pattern( AppValidators.amountFormat ) ] ],
      cashProvided: [null, [ Validators.required, Validators.min( 0.01 ), Validators.pattern( AppValidators.amountFormat ) ] ],
      denominations: DenominationsUtils.build(this.fb)
    });
    this.cajaForm.get('cashProvided')?.valueChanges.subscribe(() => {
      DenominationsUtils.clear(this.denominationsFormArray);
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

  get amountToCharge() { return this.cajaForm?.get('amountToCharge')?.value || 0; }
  get cashProvided() { return this.cajaForm?.get('cashProvided')?.value || 0; }
  get changeReturned(): number { return Math.max(0, this.cashProvided - this.amountToCharge); }

  abrirModalBilletes(content: TemplateRef<any>) {
    this.modalService.open(content, { centered: true, size: 'lg' }).result.then(
        (result) => {},
        (reason) => {
          DenominationsUtils.clear(this.denominationsFormArray);
        }
      );
  }
  cabal() {
    const amount = this.amountToCharge;
    
    // Solo copia el valor si existe y es mayor a 0
    if (amount && amount > 0) {
      this.cajaForm.patchValue({ cashProvided: amount });
    }
  }

  confirmarDesglose(modal: any) {
    this.cajaForm.patchValue(
      { cashProvided: this.totalModal.toFixed(2) },
      { emitEvent: false }
    );
    modal.close('Confirmed');
  }

  limpiarEfectivo() {
    this.cajaForm.patchValue({ openingCash: (0.00).toFixed(2) });
    DenominationsUtils.clear(this.denominationsFormArray);
  }

  descartar() {
    // 1. Limpiar campos individuales sin usar reset() en todo el formulario
    this.cajaForm.get('empleado')?.setValue('');
    this.cajaForm.get('nota')?.setValue('');
    this.cajaForm.get('amountToCharge')?.setValue(null);
    this.cajaForm.get('cashProvided')?.setValue(null);

    // 2. Reiniciar solo la "cantidad" a 0, preservando el "valor" (100, 50, 0.25...)
    DenominationsUtils.clear(this.denominationsFormArray);

    // 3. Quitar las marcas de error de validación
    this.cajaForm.markAsPristine();
    this.cajaForm.markAsUntouched();
    this.errorMessage.set(null);
  }

  verDetalles(record: TransactionRecord, modal: TemplateRef<any>) {
    this.selectedRecord = record;
    this.modalService.open(modal, { centered: true, size: 'md' });
  }

  guardarCobro() {
    if (this.cajaForm.invalid) {
      this.cajaForm.markAllAsTouched();
      this.errorMessage.set('Completa los campos obligatorios correctamente.');
      return;
    }

    if (this.cashProvided < this.amountToCharge) {
      this.errorMessage.set('El efectivo entregado es menor a la cantidad a cobrar.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: TransactionPayload = {
      cashRegisterRecordId: this.activeSession!.id,
      amountToCharge: Number(this.amountToCharge),
      cashProvided: Number(this.cashProvided),
      changeReturned: Number(this.changeReturned),
      employeeId: Number(this.cajaForm.value.empleado),
      note: this.cajaForm.value.nota || '',
      denominations: this.cajaForm.value.denominations
        .filter((d: any) => d.cantidad > 0)
        .map((d: any) => ({ value: d.valor, quantity: d.cantidad }))
    };

    this.cajaService.registerTransaction(payload).subscribe({
      next: (newRecord) => {
        this.records.unshift(newRecord);
        if (this.activeSession) {
          this.activeSession.transactions = this.records;
        }
        this.descartar();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al guardar el cobro.');
        this.isSubmitting.set(false);
      }
    });
  }

  abrirModalCashInOut() {
    const modalRef = this.modalService.open(SalidaEfectivoComponent, { centered: true });
    
    // Le pasamos el ID de la caja activa al componente modal
    modalRef.componentInstance.cashRegisterRecordId = this.activeSession?.id;

    modalRef.result.then((newRecord: CashInOutRecord) => {
      if (newRecord) {
        this.cashRecords.unshift(newRecord);
        if (this.activeSession) {
          this.activeSession.cashInOut = this.cashRecords;
        }
      }
    }).catch(() => {});
  }

  abrirModalCerrarCaja() {
    const modalRef = this.modalService.open(CierreCajaComponent, { centered: true, size: 'md' });
    
    // Le pasamos la sesión activa entera para que haga sus cálculos
    modalRef.componentInstance.activeSession = this.activeSession;

    modalRef.result.then((result) => {
      if (result === 'Close Register') {
        this.router.navigate(['/abrir-caja']);
      }
    }).catch(() => {});
  }
}