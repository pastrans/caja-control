import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';
import { AuthResponse, ForgotPasswordRequest, LoginRequest, User } from '../models/auth.models';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storageService = inject(StorageService);
  private readonly endpoint = `${environment.apiUrl}/auth`;

  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  // Estado reactivo del usuario
  currentUser = signal<User | null>(this.getStoredUser());
  
  // Señales computadas
  isAuthenticated = computed(() => !!this.currentUser());
  userRole = computed(() => this.currentUser()?.role ?? null);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.endpoint}/login`, credentials).pipe(
      tap((res) => {
        this.storageService.setItem(this.TOKEN_KEY, res.token);
        this.storageService.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/forgot-password`, data);
  }

  // 👇 NUEVO: Resetear la contraseña con el token
  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/reset-password/${token}`, { password });
  }

  logout(): void {
    this.storageService.removeItem(this.TOKEN_KEY);
    this.storageService.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return this.storageService.getItem(this.TOKEN_KEY);
  }

  // Lo usan los guards en cada navegación: isAuthenticated no se entera por sí solo de que el token venció
  hasValidSession(): boolean {
    if (!this.currentUser()) return false;

    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  hasRole(allowedRoles: string[]): boolean {
    const role = this.userRole();
    return role ? allowedRoles.includes(role) : false;
  }

  // Pantalla de inicio por rol: el dashboard es solo para ADMIN
  homeUrl(): string {
    return this.hasRole(['ADMIN']) ? '/inicio' : '/caja';
  }

  // Al abrir la app, una sesión guardada con el token vencido se descarta sin llamar a la API
  private getStoredUser(): User | null {
    const rawUser = this.storageService.getItem(this.USER_KEY);
    const token = this.storageService.getItem(this.TOKEN_KEY);
    if (!rawUser || !token || this.isTokenExpired(token)) {
      this.storageService.removeItem(this.TOKEN_KEY);
      this.storageService.removeItem(this.USER_KEY);
      return null;
    }
    try {
      return JSON.parse(rawUser) as User;
    } catch {
      return null;
    }
  }

  // Lee exp (segundos) del payload del JWT. Un token ilegible cuenta como vencido.
  // Solo decide si la sesión sigue vigente en la UI; la firma la valida el backend
  private isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const { exp } = JSON.parse(json) as { exp?: number };
      return typeof exp !== 'number' || exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}