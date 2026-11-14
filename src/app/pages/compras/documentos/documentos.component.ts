import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { PurchaseDocumentsService } from '../../../services/purchase-documents.service';
import { SuppliersService } from '../../../services/suppliers.service';
import {
  PurchaseDocumentDTO,
  PurchaseDocumentFilters,
  PurchaseDocumentStatus,
  PurchaseDocumentType,
  SupplierDTO
} from '../../../models/compras.model';
import { FechaDtePipe, TipoDocumentoPipe } from '../../../pipes/compras.pipes';

const TIPOS: PurchaseDocumentType[] = ['CREDITO_FISCAL', 'NOTA_CREDITO'];
const ESTADOS: PurchaseDocumentStatus[] = ['active', 'voided', 'all'];
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Los filtros y la página viven en la URL: así los enlaces desde proveedores y reportes llegan ya filtrados
@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbPaginationModule, FechaDtePipe, TipoDocumentoPipe],
  templateUrl: './documentos.component.html'
})
export class DocumentosComponent implements OnInit {
  private readonly purchaseDocumentsService = inject(PurchaseDocumentsService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Estados reactivos
  documentos = signal<PurchaseDocumentDTO[]>([]);
  proveedores = signal<SupplierDTO[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Filtros (reflejo de la URL)
  filtros = signal<PurchaseDocumentFilters>({});

  // Paginación
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  hayFiltros = computed(() => Object.values(this.filtros()).some(v => v !== undefined));
  soloPendientes = computed(() => this.filtros().pendingLink === true);

  ngOnInit(): void {
    // Para el selector de proveedor: no se esperan más de 100
    this.suppliersService.getSuppliers(1, 100).subscribe({
      next: (res) => this.proveedores.set(res.items),
      error: () => this.proveedores.set([])
    });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.filtros.set(this.leerFiltros(params));
        const page = Number(params.get('page'));
        this.currentPage.set(Number.isInteger(page) && page > 0 ? page : 1);
        this.cargarDocumentos();
      });
  }

  cargarDocumentos(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.purchaseDocumentsService.getDocuments(this.filtros(), this.currentPage(), this.pageSize()).subscribe({
      next: (res) => {
        this.documentos.set(res.items);
        this.totalRecords.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al cargar los documentos de compra.');
        this.isLoading.set(false);
      }
    });
  }

  // Cualquier cambio de filtro vuelve a la página 1
  cambiarFiltro<K extends keyof PurchaseDocumentFilters>(clave: K, valor: PurchaseDocumentFilters[K] | null | ''): void {
    const filtros = { ...this.filtros(), [clave]: valor === null || valor === '' || valor === false ? undefined : valor };
    this.navegar(filtros, 1);
  }

  verPendientes(): void {
    this.navegar({ pendingLink: true }, 1);
  }

  limpiarFiltros(): void {
    this.navegar({}, 1);
  }

  onPageChange(page: number): void {
    this.navegar(this.filtros(), page);
  }

  private navegar(filtros: PurchaseDocumentFilters, page: number): void {
    const queryParams: Params = {};
    if (filtros.type) queryParams['type'] = filtros.type;
    if (filtros.supplierId) queryParams['supplierId'] = filtros.supplierId;
    if (filtros.from) queryParams['from'] = filtros.from;
    if (filtros.to) queryParams['to'] = filtros.to;
    if (filtros.status) queryParams['status'] = filtros.status;
    if (filtros.withWarnings) queryParams['withWarnings'] = 'true';
    if (filtros.pendingLink) queryParams['pendingLink'] = 'true';
    if (page > 1) queryParams['page'] = page;

    this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  private leerFiltros(params: ParamMap): PurchaseDocumentFilters {
    const type = params.get('type') as PurchaseDocumentType | null;
    const status = params.get('status') as PurchaseDocumentStatus | null;
    const supplierId = Number(params.get('supplierId'));
    const from = params.get('from');
    const to = params.get('to');

    return {
      type: type && TIPOS.includes(type) ? type : undefined,
      supplierId: Number.isInteger(supplierId) && supplierId > 0 ? supplierId : undefined,
      from: from && FECHA_REGEX.test(from) ? from : undefined,
      to: to && FECHA_REGEX.test(to) ? to : undefined,
      status: status && ESTADOS.includes(status) ? status : undefined,
      withWarnings: params.get('withWarnings') === 'true' || undefined,
      pendingLink: params.get('pendingLink') === 'true' || undefined
    };
  }
}
