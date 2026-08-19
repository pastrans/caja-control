import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { CajaRecord, CashRegisterDTO, CajaMapper } from '../models/caja.model';

export interface OpenCajaPayload {
  cash: number;
  denominations: { value: number; quantity: number }[];
  note: string;
}

@Injectable({
  providedIn: 'root'
})
export class CajaService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/cash-registers`;

  getActiveCaja(): Observable<CajaRecord | null> {
    return this.http.get<CashRegisterDTO>(`${this.endpoint}/active`).pipe(
      map(dto => dto ? CajaMapper.fromDTO(dto) : null),
      catchError(() => of(null)) // Si da 404 o error, asumimos que no hay caja activa
    );
  }

  openCaja(payload: OpenCajaPayload): Observable<CajaRecord> {
    return this.http.post<CashRegisterDTO>(`${this.endpoint}/open`, payload).pipe(
      map(dto => CajaMapper.fromDTO(dto))
    );
  }
}