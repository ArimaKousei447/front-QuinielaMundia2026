import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ServiciosQuiniela } from '../../services/servicios-quiniela';
import { AppHeaderComponent } from '../shell/header/header';
import { AppFooterComponent } from '../shell/footer/footer';
import {
  Botin,
  Equipo,
  Partido,
  ResultadoGrupoDetalle,
  ResultadoGruposStats,
  ResultadoPartidoDetalle,
  ResultadoPartidosStats,
  UsuarioAdmin,
} from '../../models/quiniela.models';

@Component({
  standalone: true,
  selector: 'app-admin-resultados',
  imports: [FormsModule, AppHeaderComponent, AppFooterComponent],
  templateUrl: './admin-resultados.html',
  styleUrls: ['./admin-resultados.css'],
})
export class AdminResultados {
  private readonly servicio = inject(ServiciosQuiniela);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  activeSection = signal<'partido' | 'grupos' | 'consolidar' | 'usuarios' | 'botin'>('partido');

  // Base
  equipos = signal<Equipo[]>([]);
  partidos = signal<Partido[]>([]);

  // Registro de partido eliminatorio
  selectedPartidoId = signal<number | null>(null);
  selectedGanadorId = signal<number | null>(null);
  loadingPartidos = signal(false);

  // Visualización resultados de partidos
  resultadosPartidosStats = signal<ResultadoPartidosStats | null>(null);
  resultadosPartidosDetalle = signal<ResultadoPartidoDetalle[]>([]);
  loadingResultadosPartidos = signal(false);

  // Selección de clasificados, primeros lugares y mejores terceros de grupos
  adminSelectedClasificados = signal<Record<string, number[]>>({});
  adminSelectedTerceros = signal<Record<string, number>>({});
  adminSelectedPrimeros = signal<Record<string, number>>({});

  // Visualización resultados de grupos
  resultadosGruposStats = signal<ResultadoGruposStats | null>(null);
  resultadosGruposDetalle = signal<ResultadoGrupoDetalle[]>([]);
  loadingResultadosGrupos = signal(false);

  // Botín
  botines = signal<Botin[]>([]);
  loadingBotin = signal(false);
  editMontos = signal<Record<number, number>>({});
  savingBotin = signal<Record<number, boolean>>({});
  saveMsgs = signal<Record<number, { type: 'success' | 'error'; text: string }>>({});

  // General
  loading = signal(false);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  // Usuarios
  usuarios = signal<UsuarioAdmin[]>([]);
  loadingUsuarios = signal(false);
  nuevoNombre = signal('');
  nuevoEmail = signal('');
  nuevaContrasena = signal('');
  nuevoRol = signal<number>(1);

  private notifTimer: number | null = null;

  // Computed grupos form
  adminGrupos = computed(() => {
    const grouped: Record<string, Equipo[]> = {};
    for (const e of this.equipos()) {
      const g = e.Grupo ?? 'Sin grupo';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(e);
    }
    return grouped;
  });

  adminGrupoNames = computed(() => Object.keys(this.adminGrupos()).sort());

  adminTerceroCount = computed(() => Object.keys(this.adminSelectedTerceros()).length);

  adminPrimeroCount = computed(() => Object.keys(this.adminSelectedPrimeros()).length);

  canSubmitGrupos = computed(() => {
    const groups = this.adminGrupoNames();
    if (groups.length === 0) return false;
    for (const g of groups) {
      if ((this.adminSelectedClasificados()[g] ?? []).length !== 2) return false;
      const primero = this.adminSelectedPrimeros()[g];
      if (primero === undefined) return false;
      if (!(this.adminSelectedClasificados()[g] ?? []).includes(primero)) return false;
    }
    return this.adminTerceroCount() === 8;
  });

  adminClasificadoCount = computed(() => {
    let total = 0;
    for (const ids of Object.values(this.adminSelectedClasificados())) {
      total += ids.length;
    }
    return total;
  });

  selectedPartido = computed(() =>
    this.partidos().find(p => p.IdPartido === this.selectedPartidoId()) ?? null
  );

  constructor() {
    this.loadData();
    this.loadUsuarios();
  }

  loadData(): void {
    this.servicio.getEquipos().subscribe({
      next: (r) => { if (!r.hasError) this.equipos.set(r.data ?? []); },
      error: () => {},
    });
    this.loadPartidos();
    this.loadResultadosGrupos();
    this.loadResultadosPartidos();
    this.loadBotin();
  }

  // ---- Partidos ----

  loadPartidos(): void {
    this.loadingPartidos.set(true);
    this.servicio.getPartidos().subscribe({
      next: (r) => {
        this.loadingPartidos.set(false);
        if (!r.hasError) this.partidos.set(r.data ?? []);
      },
      error: () => this.loadingPartidos.set(false),
    });
  }

  loadResultadosPartidos(): void {
    this.loadingResultadosPartidos.set(true);
    this.servicio.getResultadosPartidos().subscribe({
      next: (r) => {
        this.loadingResultadosPartidos.set(false);
        if (!r.hasError) {
          this.resultadosPartidosStats.set(r.data.stats);
          this.resultadosPartidosDetalle.set(r.data.detalle);
        }
      },
      error: () => this.loadingResultadosPartidos.set(false),
    });
  }

  onPartidoChange(idStr: string): void {
    const id = Number(idStr);
    this.selectedPartidoId.set(isNaN(id) ? null : id);
    this.selectedGanadorId.set(null);
  }

  registrarResultadoPartido(): void {
    const idPartido = this.selectedPartidoId();
    const idGanador = this.selectedGanadorId();
    if (!idPartido || !idGanador) {
      this.notify('error', 'Selecciona un partido y un ganador.');
      return;
    }
    this.loading.set(true);
    this.servicio.registrarResultadoPartido(idPartido, idGanador).subscribe({
      next: (r) => {
        this.loading.set(false);
        if (r.hasError) {
          this.notify('error', r.errors?.[0]?.descripcion ?? 'Error al registrar resultado.');
          return;
        }
        this.notify('success', r.data?.mensaje ?? 'Resultado registrado.');
        this.selectedPartidoId.set(null);
        this.selectedGanadorId.set(null);
        this.loadPartidos();
        this.loadResultadosPartidos();
      },
      error: (httpError: HttpErrorResponse) => {
        this.loading.set(false);
        const msg = httpError?.error?.errors?.[0]?.descripcion ?? 'Error al conectar con el servidor.';
        this.notify('error', msg);
      },
    });
  }

  // ---- Grupos ----

  loadResultadosGrupos(): void {
    this.loadingResultadosGrupos.set(true);
    this.servicio.getResultadosGrupos(1).subscribe({
      next: (r) => {
        this.loadingResultadosGrupos.set(false);
        if (!r.hasError) {
          this.resultadosGruposStats.set(r.data.stats);
          this.resultadosGruposDetalle.set(r.data.detalle);
          this.preselectFromDetalle(r.data.detalle);
        }
      },
      error: () => this.loadingResultadosGrupos.set(false),
    });
  }

  private preselectFromDetalle(detalle: ResultadoGrupoDetalle[]): void {
    const clasificados: Record<string, number[]> = {};
    const terceros: Record<string, number> = {};
    const primeros: Record<string, number> = {};

    for (const item of detalle) {
      const g = item.Grupo;
      if (item.EsPrimerLugar) {
        primeros[g] = item.IdEquipo;
        if (!clasificados[g]) clasificados[g] = [];
        if (!clasificados[g].includes(item.IdEquipo)) {
          clasificados[g].push(item.IdEquipo);
        }
      } else if (item.EsMejorTercero) {
        terceros[g] = item.IdEquipo;
      } else {
        if (!clasificados[g]) clasificados[g] = [];
        clasificados[g].push(item.IdEquipo);
      }
    }

    this.adminSelectedClasificados.set(clasificados);
    this.adminSelectedTerceros.set(terceros);
    this.adminSelectedPrimeros.set(primeros);
  }

  isAdminClasificado(group: string, teamId: number): boolean {
    return (this.adminSelectedClasificados()[group] ?? []).includes(teamId);
  }

  clasificadoCountAdmin(group: string): number {
    return (this.adminSelectedClasificados()[group] ?? []).length;
  }

  toggleAdminClasificado(group: string, teamId: number): void {
    const current = { ...this.adminSelectedClasificados() };
    const selected = [...(current[group] ?? [])];
    const idx = selected.indexOf(teamId);
    if (idx >= 0) {
      selected.splice(idx, 1);
      const primeros = { ...this.adminSelectedPrimeros() };
      if (primeros[group] === teamId) {
        delete primeros[group];
        this.adminSelectedPrimeros.set(primeros);
      }
    } else {
      if (selected.length >= 2) return;
      selected.push(teamId);
      // Si estaba como tercero en este grupo, quitarlo
      const terceros = { ...this.adminSelectedTerceros() };
      if (terceros[group] === teamId) {
        delete terceros[group];
        this.adminSelectedTerceros.set(terceros);
      }
    }
    current[group] = selected;
    this.adminSelectedClasificados.set(current);
  }

  isAdminTercero(group: string, teamId: number): boolean {
    return this.adminSelectedTerceros()[group] === teamId;
  }

  canToggleAdminTercero(group: string, teamId: number): boolean {
    if (this.isAdminClasificado(group, teamId)) return false;
    const current = this.adminSelectedTerceros()[group];
    if (current === teamId) return true;
    if (current !== undefined) return false;
    return this.adminTerceroCount() < 8;
  }

  isAdminPrimero(group: string, teamId: number): boolean {
    return this.adminSelectedPrimeros()[group] === teamId;
  }

  canToggleAdminPrimero(group: string, teamId: number): boolean {
    if (!(this.adminSelectedClasificados()[group] ?? []).includes(teamId)) return false;
    if (this.adminSelectedTerceros()[group] === teamId) return false;
    return true;
  }

  toggleAdminPrimero(group: string, teamId: number): void {
    if (!this.canToggleAdminPrimero(group, teamId)) return;
    const current = { ...this.adminSelectedPrimeros() };
    if (current[group] === teamId) {
      delete current[group];
    } else {
      current[group] = teamId;
    }
    this.adminSelectedPrimeros.set(current);
  }

  toggleAdminTercero(group: string, teamId: number): void {
    if (this.isAdminClasificado(group, teamId)) return;
    const current = { ...this.adminSelectedTerceros() };
    if (current[group] === teamId) {
      delete current[group];
    } else {
      if (current[group] !== undefined) return;
      if (this.adminTerceroCount() >= 8) return;
      current[group] = teamId;
    }
    this.adminSelectedTerceros.set(current);
  }

  submitResultadosGrupos(): void {
    if (!this.canSubmitGrupos()) return;
    const resultados: { IdEquipo: number; EsMejorTercero: boolean; EsPrimerLugar: boolean }[] = [];

    for (const [group, ids] of Object.entries(this.adminSelectedClasificados())) {
      for (const id of ids) {
        resultados.push({
          IdEquipo: id,
          EsMejorTercero: false,
          EsPrimerLugar: this.adminSelectedPrimeros()[group] === id,
        });
      }
    }
    for (const id of Object.values(this.adminSelectedTerceros())) {
      resultados.push({ IdEquipo: id, EsMejorTercero: true, EsPrimerLugar: false });
    }

    this.loading.set(true);
    this.servicio.registrarResultadosGrupos(1, resultados).subscribe({
      next: (r) => {
        this.loading.set(false);
        if (r.hasError) {
          this.notify('error', r.errors?.[0]?.descripcion ?? 'Error al registrar resultados.');
          return;
        }
        this.notify('success', r.data?.mensaje ?? 'Resultados de grupo registrados.');
        this.loadResultadosGrupos();
      },
      error: (httpError: HttpErrorResponse) => {
        this.loading.set(false);
        const msg = httpError?.error?.errors?.[0]?.descripcion ?? 'Error al conectar con el servidor.';
        this.notify('error', msg);
      },
    });
  }

  // ---- Consolidar ----

  consolidarPuntos(): void {
    this.loading.set(true);
    this.servicio.consolidarPuntos().subscribe({
      next: (r) => {
        this.loading.set(false);
        if (r.hasError) {
          this.notify('error', r.errors?.[0]?.descripcion ?? 'Error al consolidar puntos.');
          return;
        }
        this.notify('success', r.data?.mensaje ?? 'Puntos consolidados correctamente.');
      },
      error: (httpError: HttpErrorResponse) => {
        this.loading.set(false);
        const msg = httpError?.error?.errors?.[0]?.descripcion ?? 'Error al conectar con el servidor.';
        this.notify('error', msg);
      },
    });
  }

  // ---- Usuarios ----

  loadUsuarios(): void {
    this.loadingUsuarios.set(true);
    this.auth.obtenerUsuarios().subscribe({
      next: (r) => {
        this.loadingUsuarios.set(false);
        if (!r.hasError) this.usuarios.set(r.data ?? []);
        else this.notify('error', r.errors?.[0]?.descripcion ?? 'Error al cargar usuarios.');
      },
      error: (httpError: HttpErrorResponse) => {
        this.loadingUsuarios.set(false);
        const msg = httpError?.error?.errors?.[0]?.descripcion ?? 'Error al conectar con el servidor.';
        this.notify('error', msg);
      },
    });
  }

  crearUsuario(): void {
    const nombre = this.nuevoNombre().trim();
    const email = this.nuevoEmail().trim();
    const contrasena = this.nuevaContrasena().trim();
    if (!nombre || !email || !contrasena) {
      this.notify('error', 'Completa todos los campos.');
      return;
    }
    this.loading.set(true);
    this.auth.crearUsuario(nombre, email, contrasena, this.nuevoRol()).subscribe({
      next: (r) => {
        this.loading.set(false);
        if (r.hasError) {
          this.notify('error', r.errors?.[0]?.descripcion ?? 'Error al crear usuario.');
          return;
        }
        this.notify('success', r.data?.mensaje ?? 'Usuario creado correctamente.');
        this.nuevoNombre.set('');
        this.nuevoEmail.set('');
        this.nuevaContrasena.set('');
        this.nuevoRol.set(1);
        this.loadUsuarios();
      },
      error: (httpError: HttpErrorResponse) => {
        this.loading.set(false);
        const msg = httpError?.error?.errors?.[0]?.descripcion ?? 'Error al conectar con el servidor.';
        this.notify('error', msg);
      },
    });
  }

  // ---- Botín ----

  loadBotin(): void {
    this.loadingBotin.set(true);
    this.servicio.getBotin().subscribe({
      next: (r) => {
        this.loadingBotin.set(false);
        if (!r.hasError) {
          this.botines.set(r.data ?? []);
          const montos: Record<number, number> = {};
          for (const b of (r.data ?? [])) {
            montos[b.IdBotin] = b.MontoTotal;
          }
          this.editMontos.set(montos);
        }
      },
      error: () => this.loadingBotin.set(false),
    });
  }

  setEditMonto(idBotin: number, value: number): void {
    this.editMontos.set({ ...this.editMontos(), [idBotin]: value });
  }

  guardarBotin(botin: Botin): void {
    const monto = this.editMontos()[botin.IdBotin] ?? 0;
    this.savingBotin.set({ ...this.savingBotin(), [botin.IdBotin]: true });
    this.saveMsgs.set({ ...this.saveMsgs(), [botin.IdBotin]: { type: 'success', text: '' } });

    this.servicio.actualizarBotin({ IdBotin: botin.IdBotin, MontoTotal: monto }).subscribe({
      next: (r) => {
        this.savingBotin.set({ ...this.savingBotin(), [botin.IdBotin]: false });
        if (r.hasError) {
          this.saveMsgs.set({ ...this.saveMsgs(), [botin.IdBotin]: {
            type: 'error',
            text: r.errors?.[0]?.descripcion ?? 'Error al guardar.',
          }});
          return;
        }
        const updated = this.botines().map(b =>
          b.IdBotin === botin.IdBotin ? { ...b, MontoTotal: r.data?.montoTotal ?? monto } : b
        );
        this.botines.set(updated);
        this.saveMsgs.set({ ...this.saveMsgs(), [botin.IdBotin]: {
          type: 'success',
          text: r.data?.mensaje ?? 'Guardado correctamente.',
        }});
      },
      error: (httpError: HttpErrorResponse) => {
        this.savingBotin.set({ ...this.savingBotin(), [botin.IdBotin]: false });
        const msg = httpError?.error?.errors?.[0]?.descripcion ?? 'Error al conectar con el servidor.';
        this.saveMsgs.set({ ...this.saveMsgs(), [botin.IdBotin]: { type: 'error', text: msg } });
      },
    });
  }

  formatMonto(value: number): string {
    return 'L. ' + value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---- Utils ----

  getFlagUrl(codigoISO: string | null): string {
    return this.servicio.getFlagUrl(codigoISO);
  }

  notify(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    if (this.notifTimer) window.clearTimeout(this.notifTimer);
    this.notifTimer = window.setTimeout(() => this.notification.set(null), 4000);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  goHome(): void {
    this.router.navigateByUrl('/home');
  }
}
