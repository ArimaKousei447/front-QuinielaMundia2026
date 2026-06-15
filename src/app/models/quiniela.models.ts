export interface Equipo {
  IdEquipo: number;
  Nombre: string;
  Grupo: string;
  CodigoISO: string | null;
  flagUrl?: string;
}

export interface Modalidad {
  IdModalidad: number;
  Nombre: string;
  fechaDeCierre: string | null;
}

export interface Partido {
  IdPartido: number;
  IdModalidad: number;
  NombreModalidad: string;
  IdEquipo1: number;
  Equipo1: string;
  CodigoISO1: string | null;
  GrupoEquipo1: string;
  IdEquipo2: number;
  Equipo2: string;
  CodigoISO2: string | null;
  GrupoEquipo2: string;
  IdGanador: number | null;
  NombreGanador: string | null;
  FechaPartido: string | null;
}

export interface FilaClasificacion {
  Posicion: number;
  IdUsuario: number;
  Nombre: string;
  PuntosTotales: number;
  PuntosGrupos: number;
  PuntosPartidos: number;
}

export interface PrediccionEquipo {
  IdPrediccion: number;
  IdModalidad: number;
  NombreModalidad: string;
  fechaDeCierre: string | null;
  IdEquipo: number;
  NombreEquipo: string;
  Grupo: string;
  CodigoISO: string | null;
  EsMejorTercero: boolean;
  PuntosGanados: number;
  FechaPrediccion: string;
}

export interface PrediccionPartido {
  IdPrediccion: number;
  IdModalidad: number;
  NombreModalidad: string;
  fechaDeCierre: string | null;
  IdPartido: number;
  IdEquipo1: number;
  Equipo1: string;
  CodigoISO1: string | null;
  IdEquipo2: number;
  Equipo2: string;
  CodigoISO2: string | null;
  IdEquipoGanadorPrediccion: number;
  PrediccionGanador: string;
  GanadorReal: string | null;
  PuntosGanados: number;
}

export interface UsuarioAdmin {
  IdUsuario: number;
  Nombre: string;
  Email: string;
  IdRol: number;
  PrimerLogin: boolean;
}

export interface ApiResponse<T> {
  data: T;
  errors: { codigo: number | string; descripcion: string }[];
  hasError: boolean;
}

export interface PrediccionGrupoPayload {
  IdEquipo: number;
  EsMejorTercero: number;
}

export interface PrediccionPartidoPayload {
  IdPartido: number;
  IdEquipoGanador: number;
  IdModalidad: number;
}

// ✓ Fix aplicado — quiniela.models.ts
