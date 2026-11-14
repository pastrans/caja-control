import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductHistoryDTO, ProductPeriod, PurchaseProductFilters, PurchaseProductsDTO } from '../models/compras.model';

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
}
