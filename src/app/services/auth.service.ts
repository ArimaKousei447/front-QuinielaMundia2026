import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse, UsuarioAdmin } from '../models/quiniela.models';

interface LoginData {
  idUsuario: number;
  nombre: string;
  idRol: number;
  primerLogin: boolean;
  accessToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = 'http://localhost:3000/security/auth';
  private readonly TOKEN_KEY = 'quinielaToken';
  private readonly USER_KEY = 'quinielaUser';

  constructor(private readonly http: HttpClient) {}

  login(email: string, contrasena: string): Observable<ApiResponse<LoginData>> {
    const body = { Email: email, Contrasena: contrasena };
    return this.http.post<ApiResponse<LoginData>>(`${this.base}/login`, body).pipe(
      tap((response) => {
        if (!response.hasError && response.data) {
          const token = response.data.accessToken ?? String(response.data.idUsuario);
          localStorage.setItem(this.TOKEN_KEY, token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
        }
      })
    );
  }

  cambiarPassword(
    idUsuario: number,
    contrasenaActual: string,
    contrasenaNueva: string
  ): Observable<ApiResponse<{ mensaje: string }>> {
    const body = { IdUsuario: idUsuario, ContrasenaActual: contrasenaActual, ContrasenaNueva: contrasenaNueva };
    return this.http.post<ApiResponse<{ mensaje: string }>>(`${this.base}/cambiarPassword`, body);
  }

  actualizarPrimerLogin(): void {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      data.primerLogin = false;
      localStorage.setItem(this.USER_KEY, JSON.stringify(data));
    } catch { /* noop */ }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getUserData(): LoginData | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LoginData;
    } catch {
      return null;
    }
  }

  getUserId(): number | null {
    const data = this.getUserData();
    return data ? data.idUsuario : null;
  }

  getUserName(): string | null {
    const data = this.getUserData();
    return data ? data.nombre : null;
  }

  getUserRole(): number | null {
    const data = this.getUserData();
    return data ? data.idRol : null;
  }

  getPrimerLogin(): boolean {
    const data = this.getUserData();
    return data?.primerLogin ?? false;
  }

  crearUsuario(
    nombre: string,
    email: string,
    contrasenaTemporal: string,
    idRol: number
  ): Observable<ApiResponse<{ idUsuario: number; mensaje: string }>> {
    const body = { Nombre: nombre, Email: email, ContrasenaTemporal: contrasenaTemporal, IdRol: idRol };
    return this.http.post<ApiResponse<{ idUsuario: number; mensaje: string }>>(`${this.base}/crearUsuario`, body);
  }

  obtenerUsuarios(): Observable<ApiResponse<UsuarioAdmin[]>> {
    return this.http.get<ApiResponse<UsuarioAdmin[]>>(`${this.base}/usuarios`);
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

// ✓ Fix aplicado — auth.service.ts
