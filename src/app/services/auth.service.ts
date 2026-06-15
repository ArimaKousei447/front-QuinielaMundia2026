import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/quiniela.models';

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

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

// ✓ Fix aplicado — auth.service.ts
