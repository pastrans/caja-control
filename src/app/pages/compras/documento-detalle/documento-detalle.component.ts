import { Component, DestroyRef, OnInit, TemplateRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbModal, NgbModalModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PurchaseDocumentsService } from '../../../services/purchase-documents.service';
import { PurchaseDocumentDetailDTO, VoidPurchaseDocumentResponse } from '../../../models/compras.model';
import { AnularDocumentoComponent } from '../../../components/anular-documento/anular-documento.component';
import { AdvertenciaPipe, CondicionOperacionPipe, FechaDtePipe, TipoDocumentoPipe } from '../../../pipes/compras.pipes';
import { CODIGOS_CON_DETALLE } from '../../../utils/compras.utils';

interface FilaTotal {
  label: string;
  valor: number;
  siempre: boolean; // Total, gravado e IVA se muestran aunque vengan en 0
  resta?: boolean;
}

@Component({
  selector: 'app-documento-detalle',
  standalone: true,
  imports: [
    CommonModule, RouterLink, NgbModalModule, NgbTooltipModule,
    AdvertenciaPipe, CondicionOperacionPipe, FechaDtePipe, TipoDocumentoPipe
  ],
  templateUrl: './documento-detalle.component.html'
})
export class DocumentoDetalleComponent implements OnInit {
  private readonly purchaseDocumentsService = inject(PurchaseDocumentsService);
  private readonly modalService = inject(NgbModal);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly codigosConDetalle = CODIGOS_CON_DETALLE;

  // Estados reactivos
  documento = signal<PurchaseDocumentDetailDTO | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  isReactivating = signal<boolean>(false);
  mensajeExito = signal<string | null>(null);
  avisoNotasCredito = signal<boolean>(false); // La anulación respondió HAS_CREDIT_NOTES

  esNotaCredito = computed(() => this.documento()?.type === 'NOTA_CREDITO');
  notasCreditoActivas = computed(() => (this.documento()?.creditNotes ?? []).filter(nc => !nc.voided));

  filasTotales = computed<FilaTotal[]>(() => {
    const t = this.documento()?.totals;
    if (!t) return [];

    const filas: FilaTotal[] = [
      { label: 'Gravado', valor: t.taxedTotal, siempre: true },
      { label: 'Exento', valor: t.exemptTotal, siempre: false },
      { label: 'No sujeto', valor: t.nonSubjectTotal, siempre: false },
      { label: 'Descuento', valor: t.discountTotal, siempre: false, resta: true },
      { label: 'Subtotal', valor: t.subtotal, siempre: false },
      { label: 'IVA (13 %)', valor: t.ivaAmount, siempre: true },
      { label: 'IVA percibido (1 %)', valor: t.ivaPerceived, siempre: false },
      { label: 'IVA retenido', valor: t.ivaWithheld, siempre: false, resta: true },
      { label: 'Renta retenida', valor: t.incomeTaxWithheld, siempre: false, resta: true }
    ];
    return filas.filter(f => f.siempre || f.valor !== 0);
  });

  ngOnInit(): void {
    // Se reutiliza el componente al navegar entre documentos relacionados
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.mensajeExito.set(null);
        this.avisoNotasCredito.set(false);
        this.cargarDocumento(Number(params.get('id')));
      });
  }

  cargarDocumento(id: number = this.documento()?.id ?? 0): void {
    if (!Number.isInteger(id) || id <= 0) {
      this.errorMessage.set('El documento solicitado no existe.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.purchaseDocumentsService.getDocumentById(id).subscribe({
      next: (doc) => {
        this.documento.set(doc);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.documento.set(null);
        this.errorMessage.set(err.status === 404
          ? 'El documento solicitado no existe.'
          : err.error?.error || 'Error al cargar el documento.');
        this.isLoading.set(false);
      }
    });
  }

  abrirAnular(): void {
    const doc = this.documento();
    if (!doc) return;

    const modalRef = this.modalService.open(AnularDocumentoComponent, { centered: true, backdrop: 'static' });
    modalRef.componentInstance.documento = doc;

    modalRef.result.then(
      (res: VoidPurchaseDocumentResponse) => {
        this.documento.set(res.document);
        this.avisoNotasCredito.set(res.warnings.some(w => w.code === 'HAS_CREDIT_NOTES'));
        this.mensajeExito.set('Documento anulado. Ya no cuenta en los reportes.');
      },
      () => { /* Modal cerrado sin anular */ }
    );
  }

  abrirReactivar(modal: TemplateRef<unknown>): void {
    this.modalService.open(modal, { centered: true }).result.then(
      (result) => {
        if (result === 'confirm') this.reactivar();
      },
      () => { /* Modal cerrado sin confirmar */ }
    );
  }

  private reactivar(): void {
    const doc = this.documento();
    if (!doc) return;

    this.isReactivating.set(true);
    this.errorMessage.set(null);

    this.purchaseDocumentsService.unvoidDocument(doc.id).subscribe({
      next: (actualizado) => {
        this.documento.set(actualizado);
        this.avisoNotasCredito.set(false);
        this.mensajeExito.set('Documento reactivado. Vuelve a contar en los reportes.');
        this.isReactivating.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al reactivar el documento.');
        this.isReactivating.set(false);
      }
    });
  }
}
