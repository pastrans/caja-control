import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, catchError, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { CajaRecord, CashRegisterDTO, CajaMapper, TransactionRecord, CashInOutRecord } from '../models/caja.model';

export interface OpenCajaPayload {
  cash: number;
  denominations: { value: number; quantity: number }[];
  note: string;
}

export interface TransactionPayload {
  amountToCharge: number;
  cashProvided: number;
  changeReturned: number;
  cashRegisterRecordId: number;
  employeeId: number;
  denominations: { value: number; quantity: number }[];
  note: string;
}

export interface CashInOutPayload {
  type: 'IN' | 'OUT';
  amount: number;
  reason: string;
  cashRegisterRecordId: number;
}

export interface CloseCajaPayload {
  totalTransactions: number;
  totalCashInOut: number;
  totalExpected: number;
  cashProvided: number;
  difference: number;
  denominations: { value: number; quantity: number }[];
  cashRegisterRecordId: number;
  note: string;
}

@Injectable({
  providedIn: 'root'
})
export class CajaService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/cash-registers`;

  // null solo cuando no hay caja abierta (200 con cuerpo vacío o 404). Cualquier otro error se relanza:
  // tratarlo como "sin caja" mandaría a abrir una segunda caja por un fallo de red
  getActiveCaja(): Observable<CajaRecord | null> {
    return this.http.get<CashRegisterDTO | null>(`${this.endpoint}/active`).pipe(
      map(dto => dto ? CajaMapper.fromDTO(dto) : null),
      catchError((err: HttpErrorResponse) => err.status === 404 ? of(null) : throwError(() => err))
    );
  }

  openCaja(payload: OpenCajaPayload): Observable<CajaRecord> {
    return this.http.post<CashRegisterDTO>(`${this.endpoint}/open`, payload).pipe(
      map(dto => CajaMapper.fromDTO(dto))
    );
  }

  registerTransaction(payload: TransactionPayload): Observable<TransactionRecord> {
    // Reutilizamos parte del mapper existente para devolver el registro limpio a la UI
    return this.http.post<any>(`${this.endpoint}/transactions`, payload).pipe(
      map(res => ({
        id: res.id,
        date: new Date(res.date),
        amountToCharge: res.amountToCharge,
        cashProvided: res.cashProvided,
        changeReturned: res.changeReturned,
        empleadoId: res.employee?.id || res.employeeId,
        empleadoNombre: res.employee?.name || 'Desconocido',
        nota: res.note || '',
        denominations: CajaMapper.mapDenominations(res.denominations)
      }))
    );
  }

  registerCashInOut(payload: CashInOutPayload): Observable<CashInOutRecord> {
    return this.http.post<any>(`${this.endpoint}/cash-in-out`, payload).pipe(
      map(res => ({
        id: res.id,
        type: res.type === 'IN' ? 'Entrada' : 'Salida',
        amount: res.amount,
        reason: res.reason,
        date: new Date(res.date),
        note: res.note || ''
      }))
    );
  }

  closeCaja(payload: CloseCajaPayload): Observable<CajaRecord> {
    return this.http.post<CashRegisterDTO>(`${this.endpoint}/close`, payload).pipe(
      map(dto => CajaMapper.fromDTO(dto))
    );
  }
}