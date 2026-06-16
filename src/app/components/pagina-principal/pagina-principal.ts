import { Component, computed, inject, signal, effect } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ServiciosQuiniela } from '../../services/servicios-quiniela';
import {
  Equipo,
  FilaClasificacion,
  Modalidad,
  Partido,
  PrediccionEquipo,
  PrediccionGrupoPayload,
  PrediccionPartido,
  PrediccionPartidoPayload,
} from '../../models/quiniela.models';

interface BracketTeam {
  id: string | number;
  name: string;
  flagUrl?: string;
}

interface BracketMatch {
  teamA: BracketTeam | null;
  teamB: BracketTeam | null;
  matchId: string | number | null;
}

interface KnockoutTeam {
  id: string | number;
  name: string;
  flagUrl: string | null;
}

interface KnockoutMatch {
  IdPartido: number;
  teamA: KnockoutTeam;
  teamB: KnockoutTeam;
}

interface ModalidadGroup<T> {
  idModalidad: number;
  nombreModalidad: string;
  fechaDeCierre: string | null;
  items: T[];
}

@Component({
  standalone: true,
  selector: 'app-pagina-principal',
  imports: [],
  templateUrl: './pagina-principal.html',
  styleUrls: ['./pagina-principal.css'],
})
export class PaginaPrincipal {
  private readonly servicio = inject(ServiciosQuiniela);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  equipos = signal<Equipo[]>([]);
  modalidades = signal<Modalidad[]>([]);
  activeTab = signal<'fases' | 'mis4' | 'clasificacion' | 'misPredicciones'>('fases');
  selectedModalidadId = signal<number | null>(null);
  partidos = signal<Partido[]>([]);
  knockoutMatches = signal<KnockoutMatch[]>([]);
  winners = signal<Record<string | number, string | number>>({});
  bracketRounds: BracketMatch[][] = [];
  roundLabels: string[] = [];
  selectedFour = signal<number[]>([]);
  loading = signal(true);
  error = signal<string | undefined>(undefined);
  selectedTeams = signal<Record<string, number[]>>({});
  selectedThirds = signal<Record<string, number>>({});
  sending = signal(false);
  success = signal<string | undefined>(undefined);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  userName = signal<string | null>(null);
  userId = signal<number | null>(null);
  userRole = signal<number | null>(null);
  clasificacion = signal<FilaClasificacion[]>([]);
  showModalPredicciones = signal(false);
  modalUser = signal<FilaClasificacion | null>(null);
  modalPredEquipos = signal<PrediccionEquipo[]>([]);
  modalPredPartidos = signal<PrediccionPartido[]>([]);
  modalLoading = signal(false);
  modalError = signal<string | undefined>(undefined);

  misPrediccionesEquipos = signal<PrediccionEquipo[]>([]);
  misPrediccionesPartidos = signal<PrediccionPartido[]>([]);
  misPrediccionesLoading = signal(false);
  misPrediccionesError = signal<string | undefined>(undefined);
  misPrediccionesCargadas = signal(false);

  private readonly DEFAULT_ID_MODALIDAD = 1;

  misGroupedEquipos = computed(() => this.groupByModalidad(this.misPrediccionesEquipos()));
  misGroupedPartidos = computed(() => this.groupByModalidad(this.misPrediccionesPartidos()));
  modalGroupedEquipos = computed(() => this.groupByModalidad(this.modalPredEquipos()));
  modalGroupedPartidos = computed(() => this.groupByModalidad(this.modalPredPartidos()));
  hasAnyClosedModalidad = computed(() =>
    this.modalidades().some(m => this.isFechaCerrada(m.fechaDeCierre))
  );

  grupos = computed(() => {
    const grouped: Record<string, Equipo[]> = {};
    for (const equipo of this.equipos()) {
      const grupo = this.getGrupoName(equipo);
      if (!grouped[grupo]) grouped[grupo] = [];
      grouped[grupo].push(equipo);
    }
    return grouped;
  });

  groupNames = computed(() => Object.keys(this.grupos()));

  modalidadesFases = computed(() =>
    this.modalidades().filter(m => m.IdModalidad <= 6)
  );

  hasSelections = computed(() => {
    const groups = this.groupNames();
    if (groups.length === 0) return false;
    for (const g of groups) {
      if ((this.selectedTeams()[g] ?? []).length !== 2) return false;
    }
    return this.thirdCount() === 8;
  });

  private notificationTimer: number | null = null;

  constructor() {
    this.loadUserInfo();
    this.loadEquipos();
    this.loadClasificacion();
    window.addEventListener('resize', this.resizeHandler);
    effect(() => {
      if (this.activeTab() === 'misPredicciones' && !this.misPrediccionesCargadas()) {
        this.loadMisPredicciones();
      }
    });
  }

  loadUserInfo(): void {
    this.userId.set(this.auth.getUserId());
    this.userName.set(this.auth.getUserName());
    this.userRole.set(this.auth.getUserRole());
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  goAdmin(): void {
    this.router.navigateByUrl('/admin/resultados');
  }

  loadMisPredicciones(): void {
    const id = this.userId();
    if (!id) return;
    this.misPrediccionesLoading.set(true);
    this.misPrediccionesError.set(undefined);
    this.servicio.getPrediccionesUsuario(id).subscribe({
      next: (response) => {
        this.misPrediccionesLoading.set(false);
        if (response.hasError) {
          this.misPrediccionesError.set(response.errors?.[0]?.descripcion ?? 'Error al cargar predicciones.');
          return;
        }
        this.misPrediccionesEquipos.set(response.data.prediccionesEquipos ?? []);
        this.misPrediccionesPartidos.set(response.data.prediccionesPartidos ?? []);
        this.misPrediccionesCargadas.set(true);
      },
      error: () => {
        this.misPrediccionesLoading.set(false);
        this.misPrediccionesError.set('Error al cargar tus predicciones.');
      },
    });
  }

  recargarMisPredicciones(): void {
    this.misPrediccionesCargadas.set(false);
    this.loadMisPredicciones();
  }

  showNotification(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    if (this.notificationTimer) window.clearTimeout(this.notificationTimer);
    this.notificationTimer = window.setTimeout(() => {
      this.notification.set(null);
      this.notificationTimer = null;
    }, 3000);
  }

  loadEquipos(): void {
    this.loading.set(true);
    this.error.set(undefined);

    this.servicio.getModalidades().subscribe({
      next: (response) => {
        if (response.hasError) { this.modalidades.set([]); return; }
        const arr = response.data ?? [];
        this.modalidades.set(arr);
        if (arr.length > 0 && !this.selectedModalidadId()) this.selectModalidad(arr[0]);
      },
      error: () => this.modalidades.set([]),
    });

    this.servicio.getEquipos().subscribe({
      next: (response) => {
        if (response.hasError) {
          const msg = response.errors?.[0]?.descripcion ?? 'No se pudieron cargar los equipos.';
          this.error.set(msg);
          this.showNotification('error', msg);
          this.loading.set(false);
          return;
        }
        const equipos = (response.data ?? []).map(e => ({
          ...e,
          flagUrl: this.servicio.getFlagUrl(e.CodigoISO),
        }));
        this.equipos.set(equipos);
        this.loading.set(false);
      },
      error: () => {
        const msg = 'No se pudieron cargar los equipos.';
        this.error.set(msg);
        this.showNotification('error', msg);
        this.loading.set(false);
      },
    });
  }

  loadClasificacion(): void {
    this.servicio.getClasificacion().subscribe({
      next: (response) => {
        if (response.hasError) { this.clasificacion.set([]); return; }
        this.clasificacion.set(response.data ?? []);
      },
      error: () => this.clasificacion.set([]),
    });
  }

  openUserPredicciones(user: FilaClasificacion): void {
    if (!user?.IdUsuario) return;
    this.modalLoading.set(true);
    this.modalError.set(undefined);
    this.servicio.getPrediccionesUsuario(user.IdUsuario).subscribe({
      next: (response) => {
        if (response.hasError) {
          this.modalLoading.set(false);
          this.modalError.set(response.errors?.[0]?.descripcion ?? 'Error al cargar predicciones.');
          return;
        }
        this.modalPredEquipos.set(response.data.prediccionesEquipos ?? []);
        this.modalPredPartidos.set(response.data.prediccionesPartidos ?? []);
        this.modalUser.set(user);
        this.showModalPredicciones.set(true);
        this.modalLoading.set(false);
      },
      error: () => {
        this.modalLoading.set(false);
        this.modalError.set('Error al cargar predicciones.');
      },
    });
  }

  closeModalPredicciones(): void {
    this.showModalPredicciones.set(false);
    this.modalUser.set(null);
    this.modalPredEquipos.set([]);
    this.modalPredPartidos.set([]);
    this.modalError.set(undefined);
  }

  isFechaCerrada(fecha?: string | null): boolean {
    if (!fecha) return false;
    try { return new Date() > new Date(fecha); } catch { return false; }
  }

  isPredictionVisibleByModalidad(item: PrediccionEquipo | PrediccionPartido): boolean {
    if (!item) return false;
    if (item.fechaDeCierre) return this.isFechaCerrada(item.fechaDeCierre);
    return this.modalidadIsClosed(item.IdModalidad);
  }

  groupHasThird(group: string): boolean {
    return this.selectedThirds()[group] !== undefined && this.selectedThirds()[group] !== null;
  }

  selectedThirdOfGroup(group: string): number | null {
    return this.selectedThirds()[group] ?? null;
  }

  canToggleThird(group: string, teamId: number): boolean {
    if (this.isSelected(group, teamId)) return false;
    const current = this.selectedThirdOfGroup(group);
    if (current === teamId) return true;
    if (current !== null) return false;
    return this.thirdCount() < 8;
  }

  getGrupoName(equipo: Equipo): string {
    return equipo.Grupo ?? 'Sin grupo';
  }

  teamLabel(equipo: Equipo): string {
    return equipo.Nombre;
  }

  isSelected(group: string, teamId: number): boolean {
    return (this.selectedTeams()[group] ?? []).includes(teamId);
  }

  selectedCount(group: string): number {
    return (this.selectedTeams()[group] ?? []).length;
  }

  thirdCount(): number {
    return Object.keys(this.selectedThirds()).length;
  }

  isThirdSelected(teamId: number): boolean {
    return Object.values(this.selectedThirds()).includes(teamId);
  }

  toggleTeam(group: string, teamId: number): void {
    const current = { ...this.selectedTeams() };
    const selected = [...(current[group] ?? [])];
    const index = selected.indexOf(teamId);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      if (selected.length >= 2) return;
      selected.push(teamId);
    }
    current[group] = selected;
    this.selectedTeams.set(current);
    const thirds = { ...this.selectedThirds() };
    if (thirds[group] === teamId) {
      delete thirds[group];
      this.selectedThirds.set(thirds);
    }
  }

  toggleThird(group: string, teamId: number): void {
    if (this.isSelected(group, teamId)) return;
    const current = { ...this.selectedThirds() };
    const groupThird = current[group];
    if (groupThird === teamId) {
      delete current[group];
      this.selectedThirds.set(current);
      return;
    }
    if (groupThird !== undefined) return;
    if (this.thirdCount() >= 8) return;
    current[group] = teamId;
    this.selectedThirds.set(current);
  }

  toggleFour(teamId: number): void {
    if (this.modalidadIsClosed(9)) return;
    const current = [...this.selectedFour()];
    const idx = current.indexOf(teamId);
    if (idx >= 0) {
      current.splice(idx, 1);
      this.selectedFour.set(current);
      return;
    }
    if (current.length >= 4) {
      this.showNotification('error', 'Sólo puedes seleccionar 4 equipos.');
      return;
    }
    current.push(teamId);
    this.selectedFour.set(current);
  }

  isModalidadSelected(mod: Modalidad): boolean {
    return this.selectedModalidadId() === mod.IdModalidad;
  }

  getModalidadById(id: number | null): Modalidad | null {
    if (!id) return null;
    return this.modalidades().find(m => m.IdModalidad === id) ?? null;
  }

  modalidadIsClosed(modId: number | null): boolean {
    const m = this.getModalidadById(modId);
    if (!m?.fechaDeCierre) return false;
    try { return new Date() > new Date(m.fechaDeCierre); } catch { return false; }
  }

  selectModalidad(mod: Modalidad): void {
    this.selectedModalidadId.set(mod.IdModalidad);
    this.partidos.set([]);
    this.knockoutMatches.set([]);
    this.winners.set({});

    if (mod.IdModalidad !== 1) {
      this.servicio.getPartidos(mod.IdModalidad).subscribe({
        next: (response) => {
          if (response.hasError) {
            this.partidos.set([]);
            this.knockoutMatches.set([]);
            this.buildBracketFromPartidos([]);
            return;
          }
          const list = response.data ?? [];
          this.partidos.set(list);
          this.buildKnockoutMatches(list);
          this.buildBracketFromPartidos(list);
        },
        error: () => {
          this.partidos.set([]);
          this.knockoutMatches.set([]);
          this.buildBracketFromPartidos([]);
        },
      });
    }
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  isKnockoutPhase(): boolean {
    const modId = this.selectedModalidadId();
    return modId !== null && modId >= 3 && modId <= 6;
  }

  private getEquipoByIdOrName(id: number, name: string): Equipo | null {
    const equipos = this.equipos();
    const byId = equipos.find(e => e.IdEquipo === id);
    if (byId) return byId;
    const normalizedName = this.normalizeText(name);
    if (!normalizedName) return null;
    return equipos.find(e => this.normalizeText(e.Nombre) === normalizedName) ?? null;
  }

  private resolveKnockoutTeam(id: number, name: string): KnockoutTeam {
    const equipo = this.getEquipoByIdOrName(id, name);
    return {
      id: id || name,
      name: name || equipo?.Nombre || 'Por definir',
      flagUrl: equipo?.flagUrl ?? null,
    };
  }

  buildKnockoutMatches(partidos: Partido[]): void {
    const mapped: KnockoutMatch[] = partidos.map(p => ({
      IdPartido: p.IdPartido,
      teamA: this.resolveKnockoutTeam(p.IdEquipo1, p.Equipo1),
      teamB: this.resolveKnockoutTeam(p.IdEquipo2, p.Equipo2),
    }));
    this.knockoutMatches.set(mapped);
  }

  isTeamWinner(match: KnockoutMatch, teamId: string | number): boolean {
    const winnerId = this.winners()[String(match.IdPartido)];
    return winnerId !== undefined && Number(winnerId) === Number(teamId);
  }

  winnerOfMatch(match: KnockoutMatch): KnockoutTeam | null {
    const winnerId = this.winners()[String(match.IdPartido)];
    if (winnerId === undefined || winnerId === null) return null;
    if (Number(match.teamA.id) === Number(winnerId)) return match.teamA;
    if (Number(match.teamB.id) === Number(winnerId)) return match.teamB;
    return null;
  }

  buildBracketFromPartidos(partidos: Partido[]): void {
    if (!partidos || partidos.length === 0) {
      this.bracketRounds = [];
      this.roundLabels = [];
      this.winners.set({});
      return;
    }

    const initialRound: BracketMatch[] = partidos.map(p => ({
      matchId: p.IdPartido,
      teamA: this.toBracketTeam(p.IdEquipo1, p.Equipo1, p.CodigoISO1),
      teamB: this.toBracketTeam(p.IdEquipo2, p.Equipo2, p.CodigoISO2),
    }));

    const nextRound: BracketMatch[] = new Array(Math.ceil(initialRound.length / 2)).fill(null).map(() => ({
      teamA: null,
      teamB: null,
      matchId: null,
    }));

    this.bracketRounds = [initialRound, nextRound];
    this.roundLabels = this.getRoundLabels();
    this.winners.set({});
    setTimeout(() => this.drawConnectors(), 50);
  }

  selectWinnerRound(roundIndex: number, matchIndex: number, team: BracketTeam): void {
    if (this.modalidadIsClosed(this.selectedModalidadId())) return;
    if (roundIndex !== 0) return;
    const rounds: BracketMatch[][] = this.bracketRounds || [];
    if (!rounds[roundIndex]) return;
    if (!team?.id) return;

    const match = rounds[roundIndex][matchIndex];
    if (!match) return;

    const winnerKey = this.getWinnerKey(roundIndex, matchIndex, match.matchId);
    const current = { ...this.winners() };
    const nextRound = rounds[roundIndex + 1];

    if (current[winnerKey] === team.id) {
      delete current[winnerKey];
      if (nextRound) {
        const nextIdx = Math.floor(matchIndex / 2);
        const slot = nextRound[nextIdx];
        if (slot) {
          if (matchIndex % 2 === 0) slot.teamA = null;
          else slot.teamB = null;
        }
      }
    } else {
      current[winnerKey] = team.id;
      if (nextRound) {
        const nextIdx = Math.floor(matchIndex / 2);
        const slot = nextRound[nextIdx];
        if (slot) {
          const winnerTeam: BracketTeam = { id: team.id, name: team.name, flagUrl: team.flagUrl };
          if (matchIndex % 2 === 0) slot.teamA = winnerTeam;
          else slot.teamB = winnerTeam;
        }
      }
    }

    this.winners.set(current);
    this.bracketRounds = [...rounds];
    setTimeout(() => this.drawConnectors(), 50);
  }

  floorDiv(a: number, b: number): number { return Math.floor(a / b); }

  drawConnectors(): void {
    try {
      const container: HTMLElement | null = document.querySelector('.bracket');
      const svg: SVGElement | null = container ? container.querySelector('.bracket-svg') : null;
      if (!container || !svg) return;
      const rect = container.getBoundingClientRect();
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const rounds = this.bracketRounds || [];
      for (let r = 0; r < rounds.length - 1; r++) {
        const col = container.querySelectorAll(`[data-round='${r}']`);
        const nextCol = container.querySelectorAll(`[data-round='${r + 1}']`);
        col.forEach((el, idx) => {
          const source = el as HTMLElement;
          const targetIndex = Math.floor(idx / 2);
          const target = nextCol[targetIndex] as HTMLElement | undefined;
          if (!source || !target) return;
          const s = source.getBoundingClientRect();
          const t = target.getBoundingClientRect();
          const startX = s.right - rect.left;
          const startY = s.top + s.height / 2 - rect.top;
          const endX = t.left - rect.left;
          const endY = t.top + t.height / 2 - rect.top;

          const ns = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          const dx = Math.abs(endX - startX) * 0.35;
          const d = `M ${startX} ${startY} C ${startX + dx} ${startY} ${endX - dx} ${endY} ${endX} ${endY}`;
          ns.setAttribute('d', d);
          const winnerKey = this.getWinnerKey(r, idx, rounds[r]?.[idx]?.matchId);
          const hasWinner = this.winners()[winnerKey] !== undefined;
          ns.setAttribute('stroke', hasWinner ? '#00c853' : 'rgba(255,255,255,0.12)');
          ns.setAttribute('stroke-width', '3');
          ns.setAttribute('fill', 'none');
          ns.setAttribute('class', hasWinner ? 'connector draw active' : 'connector draw');
          svg.appendChild(ns);
        });
      }
    } catch {
      // silent
    }
  }

  private toBracketTeam(teamId: number, teamName: string, codigoISO: string | null): BracketTeam | null {
    const name = String(teamName ?? '').trim();
    if (!name && !teamId) return null;
    const equipo = this.getEquipoByIdOrName(teamId, name);
    return {
      id: teamId || name,
      name: name || equipo?.Nombre || `Equipo ${teamId}`,
      flagUrl: equipo?.flagUrl ?? this.servicio.getFlagUrl(codigoISO),
    };
  }

  isRoundTeamWinner(roundIndex: number, matchIndex: number, teamId: string | number | null | undefined): boolean {
    if (teamId === null || teamId === undefined) return false;
    const round = this.bracketRounds?.[roundIndex];
    const match = round?.[matchIndex];
    if (!match) return false;
    const key = this.getWinnerKey(roundIndex, matchIndex, match.matchId);
    return this.winners()[key] === teamId;
  }

  private getWinnerKey(roundIndex: number, matchIndex: number, matchId: string | number | null): string {
    if (matchId !== null && matchId !== undefined && matchId !== '') return String(matchId);
    return `r${roundIndex}-m${matchIndex}`;
  }

  private getRoundLabels(): string[] {
    const modId = this.selectedModalidadId();
    if (modId === 3) return ['Octavos', 'Cuartos'];
    if (modId === 4) return ['Cuartos', 'Semifinal'];
    if (modId === 5) return ['Semifinal', 'Final'];
    if (modId === 6) return ['Final', 'Campeón'];
    const mod = this.modalidades().find(m => m.IdModalidad === modId);
    return [mod?.Nombre ?? 'Fase', 'Siguiente fase'];
  }

  selectWinner(partido: Partido, teamId: number): void {
    if (this.modalidadIsClosed(this.selectedModalidadId())) return;
    const pId = String(partido.IdPartido);
    const current = { ...this.winners() };
    if (current[pId] === teamId) delete current[pId];
    else current[pId] = teamId;
    this.winners.set(current);
  }

  allWinnersSelected(): boolean {
    const partidos = this.partidos();
    const winners = this.winners();
    return partidos.length > 0 && partidos.every(p => {
      const pId = String(p.IdPartido);
      return winners[pId] !== undefined && winners[pId] !== null;
    });
  }

  canSendFase(): boolean {
    if (this.modalidadIsClosed(this.selectedModalidadId())) return false;
    const modId = this.selectedModalidadId();
    if (Number(modId) === 1) return this.hasSelections();
    return this.allWinnersSelected();
  }

  sendFasePredicciones(): void {
    if (!this.canSendFase()) return;
    const modId = this.selectedModalidadId() ?? this.DEFAULT_ID_MODALIDAD;
    const usuarioId = this.userId();
    if (!usuarioId) {
      this.showNotification('error', 'Sesión no válida.');
      return;
    }

    if (Number(modId) === 1) {
      const predicciones: PrediccionGrupoPayload[] = [];

      for (const ids of Object.values(this.selectedTeams())) {
        for (const id of ids ?? []) {
          predicciones.push({
            IdEquipo: id,
            EsMejorTercero: this.isThirdSelected(id) ? 1 : 0,
          });
        }
      }
      for (const id of Object.values(this.selectedThirds())) {
        if (!predicciones.some(p => p.IdEquipo === id)) {
          predicciones.push({ IdEquipo: id, EsMejorTercero: 1 });
        }
      }

      this.sending.set(true);
      this.error.set(undefined);
      this.success.set(undefined);
      this.servicio.guardarPredicciones(predicciones, usuarioId, modId).subscribe({
        next: (response) => {
          this.sending.set(false);
          if (response.hasError) {
            this.showNotification('error', response.errors?.[0]?.descripcion ?? 'Error al guardar.');
            return;
          }
          this.showNotification('success', response.data.mensaje);
        },
        error: (httpError: HttpErrorResponse) => {
          this.sending.set(false);
          const msg = httpError?.error?.errors?.[0]?.descripcion ?? 'Error al enviar predicciones.';
          this.showNotification('error', msg);
        },
      });
      return;
    }

    const winners = this.winners();
    const matchPredicciones: PrediccionPartidoPayload[] = [];
    for (const p of this.partidos()) {
      const winner = winners[String(p.IdPartido)];
      if (winner !== undefined && winner !== null) {
        matchPredicciones.push({ IdPartido: p.IdPartido, IdEquipoGanador: Number(winner), IdModalidad: Number(modId) });
      }
    }

    this.sending.set(true);
    this.error.set(undefined);
    this.success.set(undefined);
    this.servicio.insertarPrediccionesPartidos(matchPredicciones, usuarioId).subscribe({
      next: (response) => {
        this.sending.set(false);
        if (response.hasError) {
          this.showNotification('error', response.errors?.[0]?.descripcion ?? 'Error al guardar.');
          return;
        }
        this.showNotification('success', response.data.mensaje);
      },
      error: (httpError: HttpErrorResponse) => {
        this.sending.set(false);
        const msg = httpError?.error?.errors?.[0]?.descripcion ?? 'Error al enviar predicciones.';
        this.showNotification('error', msg);
      },
    });
  }

  sendMis4Predicciones(): void {
    if (this.modalidadIsClosed(9)) return;
    if (this.selectedFour().length !== 4) {
      this.showNotification('error', 'Selecciona exactamente 4 equipos.');
      return;
    }
    const usuarioId = this.userId();
    if (!usuarioId) {
      this.showNotification('error', 'Sesión no válida.');
      return;
    }
    const predicciones: PrediccionGrupoPayload[] = this.selectedFour().map(id => ({
      IdEquipo: id,
      EsMejorTercero: 0,
    }));
    this.sending.set(true);
    this.error.set(undefined);
    this.success.set(undefined);
    this.servicio.guardarPredicciones(predicciones, usuarioId, 9).subscribe({
      next: (response) => {
        this.sending.set(false);
        if (response.hasError) {
          this.showNotification('error', response.errors?.[0]?.descripcion ?? 'Error al guardar.');
          return;
        }
        this.showNotification('success', response.data.mensaje);
      },
      error: (httpError: HttpErrorResponse) => {
        this.sending.set(false);
        const msg = httpError?.error?.errors?.[0]?.descripcion ?? 'Error al enviar predicciones.';
        this.showNotification('error', msg);
      },
    });
  }

  getFlagUrl(codigoISO: string | null): string {
    return this.servicio.getFlagUrl(codigoISO);
  }

  private groupByModalidad<T extends { IdModalidad: number; NombreModalidad: string; fechaDeCierre: string | null }>(
    items: T[]
  ): ModalidadGroup<T>[] {
    const map = new Map<number, ModalidadGroup<T>>();
    for (const item of items) {
      const entry = map.get(item.IdModalidad);
      if (entry) {
        entry.items.push(item);
      } else {
        map.set(item.IdModalidad, {
          idModalidad: item.IdModalidad,
          nombreModalidad: item.NombreModalidad,
          fechaDeCierre: item.fechaDeCierre,
          items: [item],
        });
      }
    }
    return Array.from(map.values());
  }

  private resizeHandler = () => this.drawConnectors();

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }
}

// ✓ Fix aplicado — pagina-principal.ts
