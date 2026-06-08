import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = 'http://localhost:3000/security/auth';
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private readonly http: HttpClient) {}

  login(email: string, contrasena: string): Observable<any> {
  const body = {
    Email: email,
    contrasena: contrasena
  };

  return this.http.post(`${this.base}/login`, body).pipe(
    tap((res: any) => {
      if (res && res.AccessToken) {
        localStorage.setItem(this.TOKEN_KEY, res.AccessToken);
      }
    })
  );
}

  registrar(nombre: string, email: string, contrasena: string): Observable<any> {
    const body = {
      Nombre: nombre,
      Email: email,
      contrasena: contrasena
    };
    return this.http.post(`${this.base}/registrar`, body);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getTokenPayload(): any {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = decodeURIComponent(
        atob(payload)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  getUserId(): number | null {
    const payload = this.getTokenPayload();
    return payload && payload.idUsuario ? Number(payload.idUsuario) : null;
  }

  getUserName(): string | null {
    const payload = this.getTokenPayload();
    return payload && payload.nombreUsuario ? String(payload.nombreUsuario) : null;
  }

  getUserRole(): number | null {
    const payload = this.getTokenPayload();
    return payload && payload.idRol ? Number(payload.idRol) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}
