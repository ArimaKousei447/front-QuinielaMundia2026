import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  Botin,
  Equipo,
  FilaClasificacion,
  Modalidad,
  Partido,
  PrediccionEquipo,
  PrediccionGrupoPayload,
  PrediccionPartido,
  PrediccionPartidoPayload,
  ResultadoGruposStats,
  ResultadoGrupoDetalle,
  ResultadoPartidosStats,
  ResultadoPartidoDetalle,
} from '../models/quiniela.models';

@Injectable({ providedIn: 'root' })
export class ServiciosQuiniela {
  private readonly baseUrl = 'http://localhost:3000/api/RutasPrincipales';
  private readonly http = inject(HttpClient);

  getFlagUrl(codigoISO: string | null): string {
    if (!codigoISO) return 'assets/flags/placeholder.png';
    return `https://flagcdn.com/w320/${codigoISO.toLowerCase().trim()}.png`;
  }

  getModalidades(): Observable<ApiResponse<Modalidad[]>> {
    return this.http.get<ApiResponse<Modalidad[]>>(`${this.baseUrl}/getModalidades`);
  }

  getEquipos(): Observable<ApiResponse<Equipo[]>> {
    return this.http.get<ApiResponse<Equipo[]>>(`${this.baseUrl}/getEquipos`);
  }

  getPartidos(idModalidad?: number): Observable<ApiResponse<Partido[]>> {
    const url = idModalidad !== undefined
      ? `${this.baseUrl}/getPartidos?IdModalidad=${idModalidad}`
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

  registrarResultadosGrupos(
    idModalidad: number,
    resultados: { IdEquipo: number; EsMejorTercero: boolean; EsPrimerLugar: boolean }[]
  ): Observable<ApiResponse<{ mensaje: string; calificadosCount: number }>> {
    return this.http.post<ApiResponse<{ mensaje: string; calificadosCount: number }>>(
      `${this.baseUrl}/registrarResultadosGrupos`,
      { IdModalidad: idModalidad, Resultados: resultados }
    );
  }

  getResultadosGrupos(idModalidad: number): Observable<ApiResponse<{
    stats: ResultadoGruposStats;
    detalle: ResultadoGrupoDetalle[];
  }>> {
    return this.http.get<ApiResponse<{ stats: ResultadoGruposStats; detalle: ResultadoGrupoDetalle[] }>>(
      `${this.baseUrl}/getResultadosGrupos?IdModalidad=${idModalidad}`
    );
  }

  getResultadosPartidos(idModalidad?: number): Observable<ApiResponse<{
    stats: ResultadoPartidosStats;
    detalle: ResultadoPartidoDetalle[];
  }>> {
    const url = idModalidad !== undefined
      ? `${this.baseUrl}/getResultadosPartidos?IdModalidad=${idModalidad}`
      : `${this.baseUrl}/getResultadosPartidos`;
    return this.http.get<ApiResponse<{ stats: ResultadoPartidosStats; detalle: ResultadoPartidoDetalle[] }>>(url);
  }

  consolidarPuntos(): Observable<ApiResponse<{ mensaje: string }>> {
    return this.http.post<ApiResponse<{ mensaje: string }>>(`${this.baseUrl}/consolidarPuntos`, {});
  }

  getBotin(): Observable<ApiResponse<Botin[]>> {
    return this.http.get<ApiResponse<Botin[]>>(`${this.baseUrl}/getBotin`);
  }

  actualizarBotin(payload: { IdBotin: number; MontoTotal: number }): Observable<ApiResponse<{ mensaje: string; montoTotal: number }>> {
    return this.http.post<ApiResponse<{ mensaje: string; montoTotal: number }>>(
      `${this.baseUrl}/actualizarBotin`,
      payload
    );
  }
}
