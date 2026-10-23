import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DashboardRange,
  DashboardSummaryDTO,
  GroupBy,
  SalesByEmployeeDTO,
  SalesOverTimeDTO
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/dashboard`;

  getSummary(): Observable<DashboardSummaryDTO> {
    return this.http.get<DashboardSummaryDTO>(`${this.endpoint}/summary`);
  }

  getSalesByEmployee(range: DashboardRange): Observable<SalesByEmployeeDTO> {
    const params = new HttpParams()
      .set('from', range.from)
      .set('to', range.to);

    return this.http.get<SalesByEmployeeDTO>(`${this.endpoint}/sales-by-employee`, { params });
  }

  // Sin employeeIds devuelve las ventas de todos los empleados
  getSalesOverTime(range: DashboardRange, groupBy: GroupBy, employeeIds: number[] = []): Observable<SalesOverTimeDTO> {
    let params = new HttpParams()
      .set('from', range.from)
      .set('to', range.to)
      .set('groupBy', groupBy);

    if (employeeIds.length > 0) {
      params = params.set('employeeIds', employeeIds.join(','));
    }

    return this.http.get<SalesOverTimeDTO>(`${this.endpoint}/sales-over-time`, { params });
  }
}
