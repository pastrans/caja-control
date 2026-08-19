import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Empleado,
  EmpleadoMapper,
  EmployeeBackendDTO,
  EmployeePayloadDTO,
  PaginatedResponse
} from '../models/empleado.model';

export interface EmpleadosListResult {
  empleados: Empleado[];
  page: number;
  limit: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class EmpleadosService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/employees`;

  getEmpleados(page: number = 1, limit: number = 10): Observable<EmpleadosListResult> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedResponse<EmployeeBackendDTO>>(this.endpoint, { params }).pipe(
      map(response => ({
        page: response.page,
        limit: response.limit,
        total: response.total,
        empleados: response.data.map(EmpleadoMapper.fromDTO)
      }))
    );
  }

  getEmpleadoById(id: number): Observable<Empleado> {
    return this.http.get<EmployeeBackendDTO>(`${this.endpoint}/${id}`).pipe(
      map(EmpleadoMapper.fromDTO)
    );
  }

  createEmpleado(nombre: string): Observable<Empleado> {
    const payload: EmployeePayloadDTO = EmpleadoMapper.toPayload(nombre);
    return this.http.post<EmployeeBackendDTO>(this.endpoint, payload).pipe(
      map(EmpleadoMapper.fromDTO)
    );
  }

  updateEmpleado(id: number, nombre: string, habilitado: boolean): Observable<Empleado> {
    const payload: EmployeePayloadDTO = EmpleadoMapper.toPayload(nombre, habilitado);
    return this.http.put<EmployeeBackendDTO>(`${this.endpoint}/${id}`, payload).pipe(
      map(EmpleadoMapper.fromDTO)
    );
  }

  deleteEmpleado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}