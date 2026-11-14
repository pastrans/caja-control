import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginatedResponse, PaginatedResult } from '../models/pagination.models';
import {
  ImportResponse,
  PurchaseDocumentDTO,
  PurchaseDocumentDetailDTO,
  PurchaseDocumentFilters,
  VoidPurchaseDocumentResponse
} from '../models/compras.model';

@Injectable({
  providedIn: 'root'
})
export class PurchaseDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/purchase-documents`;

  // Devuelve los eventos de la petición para mostrar el progreso de subida
  importFiles(files: File[]): Observable<HttpEvent<ImportResponse>> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file, file.name));

    return this.http.post<ImportResponse>(`${this.endpoint}/import`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  // Los enlaces next/prev de la respuesta no conservan los filtros: se pagina con page y limit
  getDocuments(filters: PurchaseDocumentFilters, page: number = 1, limit: number = 10): Observable<PaginatedResult<PurchaseDocumentDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters.type) params = params.set('type', filters.type);
    if (filters.supplierId) params = params.set('supplierId', filters.supplierId.toString());
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.withWarnings) params = params.set('withWarnings', 'true');
    if (filters.pendingLink) params = params.set('pendingLink', 'true');

    return this.http.get<PaginatedResponse<PurchaseDocumentDTO>>(this.endpoint, { params }).pipe(
      map(res => ({
        items: res.data,
        page: res.page,
        limit: res.limit,
        total: res.total
      }))
    );
  }

  getDocumentById(id: number): Observable<PurchaseDocumentDetailDTO> {
    return this.http.get<PurchaseDocumentDetailDTO>(`${this.endpoint}/${id}`);
  }

  voidDocument(id: number, reason: string): Observable<VoidPurchaseDocumentResponse> {
    return this.http.patch<VoidPurchaseDocumentResponse>(`${this.endpoint}/${id}/void`, { reason });
  }

  unvoidDocument(id: number): Observable<PurchaseDocumentDetailDTO> {
    return this.http.patch<PurchaseDocumentDetailDTO>(`${this.endpoint}/${id}/unvoid`, {});
  }
}
