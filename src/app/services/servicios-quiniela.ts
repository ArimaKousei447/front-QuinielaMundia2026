import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

export interface Equipo {
  id: string | number;
  name: string;
  grupo?: string;
  group?: string;
  flagUrl?: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class ServiciosQuiniela {
  private readonly baseUrl = 'http://localhost:3000/api/RutasPrincipales';

  // Mapeo de nombres de equipos a códigos de país ISO 2
  private readonly COUNTRY_CODES: Record<string, string> = {
    'Argentina': 'ar', 'Brasil': 'br', 'Uruguay': 'uy', 'Paraguay': 'py', 'Chile': 'cl', 'Colombia': 'co', 'Ecuador': 'ec', 'Perú': 'pe', 'Bolivia': 'bo', 'Venezuela': 've',
    'Mexico': 'mx', 'Estados Unidos': 'us', 'Canadá': 'ca', 'Costa Rica': 'cr', 'Honduras': 'hn', 'Jamaica': 'jm', 'Panamá': 'pa', 'Nicaragua': 'ni', 'El Salvador': 'sv', 'Guatemala': 'gt',
    'Alemania': 'de', 'Francia': 'fr', 'España': 'es', 'Italia': 'it', 'Portugal': 'pt', 'Países Bajos': 'nl', 'Bélgica': 'be', 'Suiza': 'ch', 'Austria': 'at', 'República Checa': 'cz',
    'Suecia': 'se', 'Noruega': 'no', 'Dinamarca': 'dk', 'Finlandia': 'fi', 'Polonia': 'pl', 'Rumania': 'ro', 'Hungría': 'hu', 'Croacia': 'hr', 'Serbia': 'rs', 'Bosnia': 'ba',
    'Turquía': 'tr', 'Grecia': 'gr', 'Eslovaquia': 'sk', 'Eslovenia': 'si', 'Bulgaria': 'bg', 'Ucrania': 'ua', 'Rusia': 'ru', 'Georgia': 'ge', 'Malta': 'mt', 'Chipre': 'cy',
    'Marruecos': 'ma', 'Argelia': 'dz', 'Túnez': 'tn', 'Senegal': 'sn', 'Nigeria': 'ng', 'Ghana': 'gh', 'Camerún': 'cm', 'Sudáfrica': 'za', 'Angola': 'ao',
    'Japón': 'jp', 'Corea del Sur': 'kr', 'Australia': 'au', 'China': 'cn', 'India': 'in', 'Irán': 'ir', 'Irak': 'iq', 'Arabia Saudita': 'sa', 'Emiratos Árabes': 'ae', 'Uzbekistán': 'uz',
    'Tailandia': 'th', 'Vietnam': 'vn', 'Indonesia': 'id', 'Singapur': 'sg', 'Malasia': 'my', 'Hong Kong': 'hk', 'Taiwán': 'tw', 'Pakistán': 'pk', 'Bangladesh': 'bd', 'Nueva Zelanda': 'nz',
    'Reino Unido': 'gb', 'Islandia': 'is', 'Luxemburgo': 'lu', 'Irlanda': 'ie', 'Líbano': 'lb', 'Israel': 'il', 'Siria': 'sy', 'Egipto': 'eg', 'Libia': 'ly', 'Jordania': 'jo'
  };

  constructor(private readonly http: HttpClient) {}

  private getCountryCode(teamName: string): string {
    // Buscar coincidencia exacta primero
    if (this.COUNTRY_CODES[teamName]) {
      return this.COUNTRY_CODES[teamName];
    }

    // Buscar coincidencia parcial (caso insensible)
    const lower = teamName.toLowerCase();
    for (const [key, code] of Object.entries(this.COUNTRY_CODES)) {
      if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
        return code;
      }
    }

    // Si no encuentra, usar las primeras 2 letras en minúsculas
    return teamName.substring(0, 2).toLowerCase();
  }

  private getFlagUrl(teamName: string): string {
    const code = this.getCountryCode(teamName);
    // Usar la API de flagcdn.com para obtener las banderas
    return `https://flagcdn.com/w320/${code}.png`;
  }

registrarPredicciones(
  predicciones: { IdEquipo: number; IdFase: number; EsMejorTercero: number }[],
  IdUsuario: string | number = 1,
  IdModalidad: string | number = 1
): Observable<unknown> {
  const body = {
    IdUsuario,
    IdModalidad,
    predicciones
  };

  return this.http.post(`${this.baseUrl}/registrarPredicciones`, body);
}

  registrarPrediccionesPartidos(
    predicciones: { IdPartido: number; IdEquipoGanador: number }[],
    IdUsuario: string | number = 1,
    IdModalidad: string | number = 1
  ): Observable<unknown> {
    const body = {
      IdUsuario,
      IdModalidad,
      predicciones
    };

    return this.http.post(`${this.baseUrl}/prediccionesPartidos`, body);
  }

  getFases(): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/fases`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        if (res && typeof res === 'object' && (res as any).data) return (res as any).data;
        return [];
      })
    );
  }

  getModalidades(): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/modalidades`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        if (res && typeof res === 'object' && (res as any).data) return (res as any).data;
        return [];
      })
    );
  }

  getPartidos(IdFase: string | number): Observable<unknown> {
    return this.http.get<unknown>(`${this.baseUrl}/partidos?IdFase=${IdFase}`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        if (res && typeof res === 'object' && (res as any).data) return (res as any).data;
        return [];
      })
    );
  }

  getEquipos(): Observable<Equipo[]> {
    return this.http.get<unknown>(`${this.baseUrl}/getEquipos`).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response as Equipo[];
        }

        if (response && typeof response === 'object') {
          const body = response as Record<string, unknown>;
          const data = body['data'];
          const table0 = data && typeof data === 'object' ? (data as Record<string, unknown>)['Table0'] : undefined;
          const payload = Array.isArray(table0)
            ? table0
            : body['data'] ?? body['equipos'] ?? body['items'] ?? body['teams'];

          if (!Array.isArray(payload)) {
            return [];
          }

          return payload.map((item) => {
            const row = item as Record<string, unknown>;
            const teamName = (row['Nombre'] ?? row['nombre'] ?? row['Name'] ?? row['name'] ?? '') as string;
            return {
              id: row['IdEquipo'] ?? row['id'] ?? row['Id'] ?? row['ID'] ?? '',
              name: teamName,
              grupo: (row['Grupo'] ?? row['grupo'] ?? row['Group'] ?? row['group']) as string,
              flagUrl: this.getFlagUrl(teamName),
              ...row,
            } as Equipo;
          });
        }

        return [];
      })
    );
  }
}
