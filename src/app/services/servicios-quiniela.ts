import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  Equipo,
  Fase,
  FilaClasificacion,
  Modalidad,
  Partido,
  PrediccionEquipo,
  PrediccionGrupoPayload,
  PrediccionPartido,
  PrediccionPartidoPayload,
} from '../models/quiniela.models';

@Injectable({ providedIn: 'root' })
export class ServiciosQuiniela {
  private readonly baseUrl = 'http://localhost:3000/api/RutasPrincipales';
  private readonly http = inject(HttpClient);

  getFlagUrl(codigoISO: string | null): string {
    if (!codigoISO) return 'assets/flags/placeholder.png';
    return `https://flagcdn.com/w320/${codigoISO.toLowerCase().trim()}.png`;
  }

  getFases(): Observable<ApiResponse<Fase[]>> {
    return this.http.get<ApiResponse<Fase[]>>(`${this.baseUrl}/getFases`);
  }

  getModalidades(): Observable<ApiResponse<Modalidad[]>> {
    return this.http.get<ApiResponse<Modalidad[]>>(`${this.baseUrl}/getModalidades`);
  }

  getEquipos(): Observable<ApiResponse<Equipo[]>> {
    return this.http.get<ApiResponse<Equipo[]>>(`${this.baseUrl}/getEquipos`);
  }

  getPartidos(idFase?: number): Observable<ApiResponse<Partido[]>> {
    const url = idFase !== undefined
      ? `${this.baseUrl}/getPartidos?IdFase=${idFase}`
      : `${this.baseUrl}/getPartidos`;
    return this.http.get<ApiResponse<Partido[]>>(url);
  }

  getClasificacion(): Observable<ApiResponse<FilaClasificacion[]>> {
    return this.http.get<ApiResponse<FilaClasificacion[]>>(`${this.baseUrl}/getClasificacion`);
  }

  getPrediccionesUsuario(idUsuario: number): Observable<ApiResponse<{
    prediccionesEquipos: PrediccionEquipo[];
    prediccionesPartidos: PrediccionPartido[];
  }>> {
    return this.http.get<ApiResponse<{
      prediccionesEquipos: PrediccionEquipo[];
      prediccionesPartidos: PrediccionPartido[];
    }>>(`${this.baseUrl}/getPrediccionesUsuario?IdUsuario=${idUsuario}`);
  }

  guardarPredicciones(
    predicciones: PrediccionGrupoPayload[],
    idUsuario: number,
    idModalidad: number
  ): Observable<ApiResponse<{ mensaje: string; insertadosCount: number }>> {
    const body = { IdUsuario: idUsuario, IdModalidad: idModalidad, predicciones };
    return this.http.post<ApiResponse<{ mensaje: string; insertadosCount: number }>>(
      `${this.baseUrl}/guardarPredicciones`,
      body
    );
  }

  insertarPrediccionesPartidos(
    predicciones: PrediccionPartidoPayload[],
    idUsuario: number
  ): Observable<ApiResponse<{ mensaje: string; insertadosCount: number }>> {
    const body = { IdUsuario: idUsuario, predicciones };
    return this.http.post<ApiResponse<{ mensaje: string; insertadosCount: number }>>(
      `${this.baseUrl}/insertarPrediccionesPartidos`,
      body
    );
  }

  registrarResultadoPartido(idPartido: number, idGanador: number): Observable<ApiResponse<{ mensaje: string }>> {
    return this.http.post<ApiResponse<{ mensaje: string }>>(
      `${this.baseUrl}/registrarResultadoPartido`,
      { IdPartido: idPartido, IdGanador: idGanador }
    );
  }

  registrarResultadosGrupos(grupos: { IdGrupo: string; IdEquipo1: number; IdEquipo2: number }[]): Observable<ApiResponse<{ mensaje: string }>> {
    return this.http.post<ApiResponse<{ mensaje: string }>>(
      `${this.baseUrl}/registrarResultadosGrupos`,
      { grupos }
    );
  }

  consolidarPuntos(): Observable<ApiResponse<{ mensaje: string }>> {
    return this.http.post<ApiResponse<{ mensaje: string }>>(`${this.baseUrl}/consolidarPuntos`, {});
  }
}

// ✓ Fix aplicado — servicios-quiniela.ts
