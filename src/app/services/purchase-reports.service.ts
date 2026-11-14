import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BySupplierDTO, IvaSummaryDTO, PurchaseSummaryDTO, ReportRange } from '../models/compras.model';

// Sin fechas (o sin año) el backend usa el periodo en curso según la zona del negocio;
// la respuesta trae siempre el rango o año aplicado
@Injectable({
  providedIn: 'root'
})
export class PurchaseReportsService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/purchase-reports`;

  getIvaSummary(year?: number, supplierId?: number): Observable<IvaSummaryDTO> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    if (supplierId) params = params.set('supplierId', supplierId.toString());

    return this.http.get<IvaSummaryDTO>(`${this.endpoint}/iva-summary`, { params });
  }

  getSummary(range: ReportRange = {}, supplierId?: number): Observable<PurchaseSummaryDTO> {
    let params = this.rangeParams(range);
    if (supplierId) params = params.set('supplierId', supplierId.toString());

    return this.http.get<PurchaseSummaryDTO>(`${this.endpoint}/summary`, { params });
  }

  getBySupplier(range: ReportRange = {}): Observable<BySupplierDTO> {
    return this.http.get<BySupplierDTO>(`${this.endpoint}/by-supplier`, { params: this.rangeParams(range) });
  }

  private rangeParams(range: ReportRange): HttpParams {
    let params = new HttpParams();
    if (range.from) params = params.set('from', range.from);
    if (range.to) params = params.set('to', range.to);
    return params;
  }
}
