import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MergeProductsResultDTO,
  ProductHistoryDTO,
  ProductMergeDTO,
  ProductMergeSuggestionDTO,
  ProductPeriod,
  ProductReturnsReportDTO,
  PurchaseProductFilters,
  PurchaseProductsDTO,
  ReportRange
} from '../models/compras.model';

// Los productos se deducen de las líneas de los créditos fiscales: no hay alta ni edición.
// El periodo son los últimos N meses hasta hoy (zona del negocio, lo calcula el backend)
@Injectable({
  providedIn: 'root'
})
export class PurchaseProductsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/purchase-products`;

  getProducts(filters: PurchaseProductFilters, page: number = 1, limit: number = 20): Observable<PurchaseProductsDTO> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters.period !== undefined) params = params.set('months', filters.period.toString());
    if (filters.supplierId) params = params.set('supplierId', filters.supplierId.toString());
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<PurchaseProductsDTO>(this.endpoint, { params });
  }

  // key va en la query: el código puede traer espacios, '/' o ':'
  getHistory(key: string, period?: ProductPeriod): Observable<ProductHistoryDTO> {
    let params = new HttpParams().set('key', key);
    if (period !== undefined) params = params.set('months', period.toString());

    return this.http.get<ProductHistoryDTO>(`${this.endpoint}/history`, { params });
  }

  // Devoluciones de producto por la fecha de la nota de crédito; sin fechas, el mes en curso (como los reportes)
  getReturns(range: ReportRange = {}, supplierId?: number): Observable<ProductReturnsReportDTO> {
    let params = this.supplierParams(supplierId);
    if (range.from) params = params.set('from', range.from);
    if (range.to) params = params.set('to', range.to);
    return this.http.get<ProductReturnsReportDTO>(`${this.endpoint}/returns`, { params });
  }

  // ---------- Variantes ----------

  // Grupos de productos del mismo proveedor que parecen ser el mismo (nombre parecido)
  getSuggestions(supplierId?: number): Observable<ProductMergeSuggestionDTO[]> {
    return this.http.get<ProductMergeSuggestionDTO[]>(`${this.endpoint}/suggestions`, { params: this.supplierParams(supplierId) });
  }

  // "No son el mismo producto": no se vuelve a sugerir
  dismissSuggestion(supplierId: number, signature: string): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/suggestions/dismiss`, { supplierId, signature });
  }

  getMerges(supplierId?: number): Observable<ProductMergeDTO[]> {
    return this.http.get<ProductMergeDTO[]>(`${this.endpoint}/merges`, { params: this.supplierParams(supplierId) });
  }

  merge(targetKey: string, variantKeys: string[]): Observable<MergeProductsResultDTO> {
    return this.http.post<MergeProductsResultDTO>(`${this.endpoint}/merges`, { targetKey, variantKeys });
  }

  // La variante vuelve a ser un producto propio
  unmerge(variantKey: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/merges`, { params: new HttpParams().set('key', variantKey) });
  }

  private supplierParams(supplierId?: number): HttpParams {
    return supplierId ? new HttpParams().set('supplierId', supplierId.toString()) : new HttpParams();
  }
}
