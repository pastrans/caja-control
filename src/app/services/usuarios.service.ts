import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginatedResponse, PaginatedResult } from '../models/pagination.models';
import {
  Usuario,
  UserBackendDTO,
  UsuarioMapper,
  CreateUserPayloadDTO,
  UpdateUserPayloadDTO
} from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/users`;

  getUsuarios(page: number = 1, limit: number = 10): Observable<PaginatedResult<Usuario>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedResponse<UserBackendDTO>>(this.endpoint, { params }).pipe(
      map(res => ({
        items: res.data.map(dto => UsuarioMapper.fromDTO(dto)),
        page: res.page,
        limit: res.limit,
        total: res.total
      }))
    );
  }

  getUsuarioById(id: number): Observable<Usuario> {
    return this.http.get<UserBackendDTO>(`${this.endpoint}/${id}`).pipe(
      map(dto => UsuarioMapper.fromDTO(dto))
    );
  }

  createUsuario(formValue: any): Observable<Usuario> {
    const payload: CreateUserPayloadDTO = UsuarioMapper.toCreatePayload(formValue);
    return this.http.post<UserBackendDTO>(this.endpoint, payload).pipe(
      map(dto => UsuarioMapper.fromDTO(dto))
    );
  }

  updateUsuario(id: number, formValue: any): Observable<Usuario> {
    const payload: UpdateUserPayloadDTO = UsuarioMapper.toUpdatePayload(formValue);
    return this.http.put<UserBackendDTO>(`${this.endpoint}/${id}`, payload).pipe(
      map(dto => UsuarioMapper.fromDTO(dto))
    );
  }

  deleteUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}