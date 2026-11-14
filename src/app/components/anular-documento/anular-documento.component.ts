import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PurchaseDocumentsService } from '../../services/purchase-documents.service';
import { PurchaseDocumentDetailDTO } from '../../models/compras.model';
import { TipoDocumentoPipe } from '../../pipes/compras.pipes';

export const MAX_MOTIVO_ANULACION = 500;

// Cierra con la respuesta de PATCH /:id/void (documento actualizado y advertencias)
@Component({
  selector: 'app-anular-documento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TipoDocumentoPipe],
  templateUrl: './anular-documento.component.html'
})
export class AnularDocumentoComponent {
  @Input() documento!: PurchaseDocumentDetailDTO; // Recibido desde DocumentoDetalleComponent

  public activeModal = inject(NgbActiveModal);
  private purchaseDocumentsService = inject(PurchaseDocumentsService);

  readonly maxMotivo = MAX_MOTIVO_ANULACION;
  motivo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(MAX_MOTIVO_ANULACION), Validators.pattern(/\S/)]
  });
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (this.motivo.invalid) {
      this.motivo.markAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.purchaseDocumentsService.voidDocument(this.documento.id, this.motivo.value.trim()).subscribe({
      next: (res) => this.activeModal.close(res),
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al anular el documento.');
        this.isSubmitting.set(false);
      }
    });
  }
}
