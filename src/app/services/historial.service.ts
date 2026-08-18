import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginatedResponse, PaginatedResult } from '../models/pagination.models';
import { CajaRecord, CashRegisterDTO, CajaMapper } from '../models/caja.model';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/cash-registers`;

  getHistorial(page: number = 1, limit: number = 10): Observable<PaginatedResult<CajaRecord>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedResponse<CashRegisterDTO>>(this.endpoint, { params }).pipe(
      map(res => ({
        items: res.data.map(dto => CajaMapper.fromDTO(dto)),
        page: res.page,
        limit: res.limit,
        total: res.total
      }))
    );
  }
}