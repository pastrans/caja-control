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

  getSalesOverTime(range: DashboardRange, groupBy: GroupBy, employeeId?: number | null): Observable<SalesOverTimeDTO> {
    let params = new HttpParams()
      .set('from', range.from)
      .set('to', range.to)
      .set('groupBy', groupBy);

    if (employeeId) {
      params = params.set('employeeId', employeeId.toString());
    }

    return this.http.get<SalesOverTimeDTO>(`${this.endpoint}/sales-over-time`, { params });
  }
}
