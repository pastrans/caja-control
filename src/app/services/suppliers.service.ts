import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginatedResponse, PaginatedResult } from '../models/pagination.models';
import { SupplierDTO } from '../models/compras.model';

@Injectable({
  providedIn: 'root'
})
export class SuppliersService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/suppliers`;

  // Busca en nombre, nombre comercial o NIT
  getSuppliers(page: number = 1, limit: number = 10, search: string = ''): Observable<PaginatedResult<SupplierDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<PaginatedResponse<SupplierDTO>>(this.endpoint, { params }).pipe(
      map(res => ({
        items: res.data,
        page: res.page,
        limit: res.limit,
        total: res.total
      }))
    );
  }

  getSupplierById(id: number): Observable<SupplierDTO> {
    return this.http.get<SupplierDTO>(`${this.endpoint}/${id}`);
  }
}
