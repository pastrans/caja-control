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
import { MoneyUtils } from '../../utils/money.utils';

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
  loadError = signal<string | null>(null); // Falló la consulta de la caja activa

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
    this.empleadosService.getEmpleados(1, 100).subscribe(res => {
      this.empleadas = res.empleados.filter(e => e.habilitado);
    });
  }

  verificarCajaActiva() {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.cajaService.getActiveCaja().subscribe({
      next: (caja) => {
        if (!caja) {
          this.router.navigate(['/abrir-caja']);
          return;
        }
        
        this.activeSession = caja;
        this.records = [...(caja.transactions || [])].sort((a, b) => b.date.getTime() - a.date.getTime());
        this.cashRecords = [...(caja.cashInOut || [])].sort((a, b) => b.date.getTime() - a.date.getTime());
        
        this.initForm();
        this.isLoading.set(false);
      },
      // No se redirige a /abrir-caja: puede haber una caja abierta que no se pudo consultar
      error: (err) => {
        this.loadError.set(err.error?.error || 'No se pudo consultar la caja activa. Revisa la conexión e intenta de nuevo.');
        this.isLoading.set(false);
      }
    });
  }

  initForm() {
    this.cajaForm = this.fb.group({
      empleado: ['', Validators.required],
      nota: [''],
      amountToCharge: [null, [ Validators.required, Validators.min(0.01), Validators.pattern(AppValidators.amountFormat) ] ],
      cashProvided: [null, [ Validators.required, Validators.min(0.01), Validators.pattern(AppValidators.amountFormat) ] ],
      isBillete: [false], // <--- NUEVO CONTROLADOR PARA EL CHECKBOX
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
    return MoneyUtils.totalDenominaciones(this.denominationsFormArray.value);
  }

  // Los inputs pueden traer texto ("12.50"): se normalizan a número exacto a 2 decimales
  get amountToCharge(): number { return MoneyUtils.aDolares(MoneyUtils.aCentavos(this.cajaForm?.get('amountToCharge')?.value)); }
  get cashProvided(): number { return MoneyUtils.aDolares(MoneyUtils.aCentavos(this.cajaForm?.get('cashProvided')?.value)); }
  get changeReturned(): number { return Math.max(0, MoneyUtils.restar(this.cashProvided, this.amountToCharge)); }

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
    if (amount && amount > 0) {
      this.cajaForm.patchValue({ cashProvided: amount });
    } else {
      this.cajaForm.get('amountToCharge')?.markAsTouched();
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
    this.cajaForm.patchValue({ cashProvided: null });
    DenominationsUtils.clear(this.denominationsFormArray);
  }

  asignar(valor: number) {
    this.cajaForm.patchValue({ cashProvided: valor.toFixed(2) });
  }

  descartar() {
    this.cajaForm.get('empleado')?.setValue('');
    this.cajaForm.get('nota')?.setValue('');
    this.cajaForm.get('amountToCharge')?.setValue(null);
    this.cajaForm.get('cashProvided')?.setValue(null);
    this.cajaForm.get('isBillete')?.setValue(false); // <--- LIMPIAR CHECKBOX

    DenominationsUtils.clear(this.denominationsFormArray);

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

    let denominations: any[] = this.cajaForm.value.denominations
        .filter((d: any) => d.cantidad > 0)
        .map((d: any) => ({ value: d.valor, quantity: d.cantidad }))

    // LÓGICA DEL CHECKBOX DE BILLETE EXACTO
    if (denominations.length === 0 && this.cajaForm.value.isBillete) {
      const predefinedDenominations = [50, 20, 10, 5];
      const providedNum = Number(this.cajaForm.value.cashProvided);
      
      if (predefinedDenominations.includes(providedNum)) {
        denominations.push({ value: providedNum, quantity: 1 });
      }
    }

    const payload: TransactionPayload = {
      cashRegisterRecordId: this.activeSession!.id,
      amountToCharge: this.amountToCharge,
      cashProvided: this.cashProvided,
      changeReturned: this.changeReturned,
      employeeId: Number(this.cajaForm.value.empleado),
      note: this.cajaForm.value.nota || '',
      denominations: denominations
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
        this.errorMessage.set(err.error?.error || err.error?.message || 'Error al guardar el cobro.');
        this.isSubmitting.set(false);
      }
    });
  }

  abrirModalCashInOut() {
    const modalRef = this.modalService.open(SalidaEfectivoComponent, { centered: true });
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
    modalRef.componentInstance.activeSession = this.activeSession;

    modalRef.result.then((result) => {
      if (result === 'Close Register') {
        this.router.navigate(['/abrir-caja']);
      }
    }).catch(() => {});
  }
}