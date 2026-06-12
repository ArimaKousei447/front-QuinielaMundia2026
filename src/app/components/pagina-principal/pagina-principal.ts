import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Equipo, ServiciosQuiniela } from '../../services/servicios-quiniela';

interface Prediccion {
  IdEquipo: number;
  IdFase: number;
  EsMejorTercero: number;
}

interface PartidoPrediccion {
  IdPartido: number;
  IdEquipoGanador: number;
  IdModalidad: number;
}

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

export interface Fase {
  Nombre?: string;
  nombre?: string;
  name?: string;
  IdFase?: number;
  id?: number;
}

@Component({
  standalone: true,
  selector: 'app-pagina-principal',
  imports: [CommonModule],
  templateUrl: './pagina-principal.html',
  styleUrls: ['./pagina-principal.css'],
})
export class PaginaPrincipal {
  private readonly servicio = inject(ServiciosQuiniela);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  equipos = signal<Equipo[]>([]);
  fases = signal<unknown[]>([]);
  modalidades = signal<unknown[]>([]);
  // UI state
  activeTab = signal<'fases' | 'mis4' | 'clasificacion'>('fases');
  selectedFase: any = signal(null as any);
  selectedModalidadId = signal<number | null>(null);
  partidos = signal<any[]>([]);
  knockoutMatches = signal<KnockoutMatch[]>([]);
  winners = signal<Record<string | number, string | number>>({});
  bracketRounds: BracketMatch[][] = [];
  roundLabels: string[] = [];
  // Mis 4 selecciones
  selectedFour = signal<Array<string | number>>([]);
  loading = signal(true);
  error = signal<string | undefined>(undefined);
  selectedTeams = signal<Record<string, Array<string | number>>>({});
  sending = signal(false);
  success = signal<string | undefined>(undefined);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  selectedThirds = signal<Record<string, string | number>>({});
  userName = signal<string | null>(null);
  userId = signal<number | null>(null);
  userRole = signal<number | null>(null);

  // Clasificacion
  clasificacion = signal<any[]>([]);

  // Modal para ver predicciones de un usuario
  showModalPredicciones = signal(false);
  modalUser = signal<any | null>(null);
  modalPredEquipos = signal<any[]>([]);
  modalPredPartidos = signal<any[]>([]);
  modalLoading = signal(false);
  modalError = signal<string | undefined>(undefined);

  grupos = computed(() => {
    const grouped: Record<string, Equipo[]> = {};
    for (const equipo of this.equipos()) {
      const grupo = this.getGrupoName(equipo);
      if (!grouped[grupo]) {
        grouped[grupo] = [];
      }
      grouped[grupo].push(equipo);
    }
    return grouped;
  });

  groupNames = computed(() => Object.keys(this.grupos()));

  private readonly DEFAULT_ID_USUARIO = 1;
  private readonly DEFAULT_ID_MODALIDAD = 1;
  private readonly DEFAULT_ID_FASE = 1;

  hasSelections = computed(() => {
    const groups = this.groupNames();
    if (groups.length === 0) return false;
    for (const g of groups) {
      const count = (this.selectedTeams()[g] ?? []).length;
      if (count !== 2) return false;
      if (!this.groupHasThird(g)) return false;
    }
    return this.thirdCount() === groups.length;
  });

  private notificationTimer: number | null = null;

  constructor() {
    this.loadUserInfo();
    this.loadEquipos();
    this.loadClasificacion();
    window.addEventListener('resize', this.resizeHandler);
  }

  loadClasificacion(): void {
    this.servicio.getClasificacion().subscribe({
      next: (c: any) => this.clasificacion.set(Array.isArray(c) ? c : []),
      error: () => this.clasificacion.set([]),
    });
  }

  openUserPredicciones(user: any): void {
    const userId = user?.IdUsuario ?? user?.id ?? user?.Id ?? null;
    if (!userId) return;
    this.modalLoading.set(true);
    this.modalError.set(undefined);
    this.servicio.getPrediccionesUsuario(userId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? { prediccionesEquipos: [], prediccionesPartidos: [] };
        this.modalPredEquipos.set(Array.isArray(data.prediccionesEquipos) ? data.prediccionesEquipos : []);
        this.modalPredPartidos.set(Array.isArray(data.prediccionesPartidos) ? data.prediccionesPartidos : []);
        this.modalUser.set(user);
        this.showModalPredicciones.set(true);
        this.modalLoading.set(false);
      },
      error: (err: any) => {
        this.modalLoading.set(false);
        this.modalError.set(err?.error?.message ?? 'Error al cargar predicciones.');
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
    try {
      return new Date() > new Date(fecha);
    } catch {
      return false;
    }
  }

  isPredictionVisibleByModalidad(item: any): boolean {
    if (!item) return false;
    if (item.fechaDeCierre) {
      return this.isFechaCerrada(item.fechaDeCierre);
    }
    const modalidadId = this.extractId(item, ['IdModalidad', 'id', 'Id']);
    return this.modalidadIsClosed(Number(modalidadId));
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

  showNotification(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    if (this.notificationTimer) {
      window.clearTimeout(this.notificationTimer);
    }
    this.notificationTimer = window.setTimeout(() => {
      this.notification.set(null);
      this.notificationTimer = null;
    }, 3000);
  }

  groupHasThird(group: string): boolean {
    return this.selectedThirds()[group] !== undefined && this.selectedThirds()[group] !== null;
  }

  selectedThirdOfGroup(group: string): string | number | null {
    return this.selectedThirds()[group] ?? null;
  }

  canToggleThird(group: string, teamId: string | number): boolean {
    if (this.isSelected(group, teamId)) return false;
    const currentGroupThird = this.selectedThirdOfGroup(group);
    if (currentGroupThird === teamId) return true;
    if (currentGroupThird !== null) return false;
    return this.thirdCount() < 8;
  }

  getGrupoName(equipo: Equipo): string {
    return (
      equipo.grupo ??
      equipo.group ??
      (equipo as any).grupoNombre ??
      (equipo as any).groupName ??
      'Sin grupo'
    );
  }

  loadEquipos(): void {
    this.loading.set(true);
    this.error.set(undefined);
    this.servicio.getFases().subscribe({
      next: (f: any) => {
        const arr = Array.isArray(f) ? f : [];
        this.fases.set(arr);
        if (arr.length > 0 && !this.selectedFase()) {
          this.selectFase(arr[0]);
        }
      },
      error: () => this.fases.set([]),
    });

    this.servicio.getModalidades().subscribe({
      next: (m: any) => this.modalidades.set(Array.isArray(m) ? m : []),
      error: () => this.modalidades.set([]),
    });

    this.servicio.getEquipos().subscribe({
      next: (equipos) => {
        this.equipos.set(equipos);
        this.loading.set(false);
      },
      error: () => {
        const message = 'No se pudieron cargar los equipos. Revisa la conexión con la API.';
        this.error.set(message);
        this.showNotification('error', message);
        this.loading.set(false);
      },
    });
  }

  // Helpers to read modalidad/fase fields flexibly
  extractId(obj: any, keys: string[]) {
    if (!obj) return null;
    for (const k of keys) {
      if (obj[k] !== undefined) return obj[k];
    }
    return null;
  }

  selectFase(fase: any): void {
    this.selectedFase.set(fase);
    const faseId = Number(this.extractId(fase, ['IdFase', 'id', 'Id']));
    // try to get modalidad id from fase, otherwise try to match by name
    let modId: number | null = null;
    const maybe = this.extractId(fase, ['IdModalidad', 'IdModalidadFK', 'IdModalidadId', 'IdModalidadFKId']);
    if (maybe) modId = Number(maybe);
    if (!modId) {
      const fName = String(this.extractId(fase, ['NombreFase', 'Nombre', 'nombre', 'name']) ?? '').toLowerCase();
      const mods = this.modalidades() ?? [];
      for (const m of mods) {
        const mName = String(this.extractId(m, ['Nombre', 'nombre', 'name']) ?? '').toLowerCase();
        if (!mName || !fName) continue;
        if (mName.includes(fName) || fName.includes(mName)) {
          modId = Number(this.extractId(m, ['IdModalidad', 'id', 'Id']));
          break;
        }
      }
    }
    // fallback: if fase name contains 'grupo' set modalidad 1
    const fNameLower = String(this.extractId(fase, ['NombreFase', 'Nombre', 'nombre', 'name']) ?? '').toLowerCase();
    if (!modId && fNameLower.includes('grup')) modId = 1;

    this.selectedModalidadId.set(modId ?? null);
    // cargar partidos
    if (faseId) {
      this.partidos.set([]);
      this.knockoutMatches.set([]);
      this.winners.set({});
      this.servicio.getPartidos(faseId).subscribe({
        next: (p: any) => {
          const list = Array.isArray(p) ? p : [];
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
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  isKnockoutPhase(): boolean {
    const fase = this.selectedFase();
    const faseName = this.normalizeText(this.extractId(fase, ['NombreFase', 'Nombre', 'nombre', 'name']));
    if (!faseName) return false;
    return ['dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'final'].some((name) => faseName.includes(name));
  }

  private getEquipoByIdOrName(id: unknown, name: unknown): Equipo | null {
    const equipos = this.equipos() ?? [];
    if (id !== undefined && id !== null) {
      const numericId = Number(id);
      const byId = equipos.find((e) => Number(e.id) === numericId);
      if (byId) return byId;
    }
    const normalizedName = this.normalizeText(name);
    if (!normalizedName) return null;
    const byName = equipos.find((e) => this.normalizeText(this.teamLabel(e)) === normalizedName);
    return byName ?? null;
  }

  private resolveKnockoutTeam(id: unknown, name: unknown): KnockoutTeam {
    const equipo = this.getEquipoByIdOrName(id, name);
    const fallbackName = String(name ?? (equipo ? this.teamLabel(equipo) : 'Por definir'));
    const normalizedId =
      typeof id === 'string' || typeof id === 'number'
        ? id
        : (typeof equipo?.id === 'string' || typeof equipo?.id === 'number'
          ? equipo.id
          : fallbackName);
    return {
      id: normalizedId,
      name: fallbackName,
      flagUrl: (equipo?.flagUrl as string | undefined) ?? ((equipo as any)?.flag as string | undefined) ?? null,
    };
  }

  buildKnockoutMatches(partidos: any[]): void {
    const mapped: KnockoutMatch[] = (partidos ?? []).map((p: any) => {
      const partidoId = Number(this.extractId(p, ['IdPartido', 'id', 'Id']) ?? 0);
      const teamAId = this.extractId(p, ['IdEquipo1', 'IdEquipoA', 'idEquipo1']);
      const teamBId = this.extractId(p, ['IdEquipo2', 'IdEquipoB', 'idEquipo2']);
      const teamAName = this.extractId(p, ['Equipo1', 'EquipoA', 'NombreEquipo1', 'nombreEquipo1']);
      const teamBName = this.extractId(p, ['Equipo2', 'EquipoB', 'NombreEquipo2', 'nombreEquipo2']);
      return {
        IdPartido: partidoId,
        teamA: this.resolveKnockoutTeam(teamAId, teamAName),
        teamB: this.resolveKnockoutTeam(teamBId, teamBName),
      };
    });
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

  // Build rounds (columns) for visual bracket from partidos
  buildBracketFromPartidos(partidos: any[]): void {
    if (!partidos || partidos.length === 0) {
      this.bracketRounds = [];
      this.roundLabels = [];
      this.winners.set({});
      return;
    }

    const initialRound: BracketMatch[] = partidos.map((p) => {
      const teamAId = p.IdEquipo1 ?? p.IdEquipoA ?? p.idEquipo1 ?? p.idEquipoA ?? null;
      const teamBId = p.IdEquipo2 ?? p.IdEquipoB ?? p.idEquipo2 ?? p.idEquipoB ?? null;
      const teamAName = p.Equipo1 ?? p.NombreEquipo1 ?? p.EquipoA ?? p.equipo1 ?? p.equipoA ?? '';
      const teamBName = p.Equipo2 ?? p.NombreEquipo2 ?? p.EquipoB ?? p.equipo2 ?? p.equipoB ?? '';

      return {
        matchId: p.IdPartido ?? p.Id ?? p.id ?? null,
        teamA: this.toBracketTeam(teamAId, teamAName),
        teamB: this.toBracketTeam(teamBId, teamBName),
      };
    });

    // Mostrar solo dos columnas: fase seleccionada y la fase que se predice.
    const nextRound: BracketMatch[] = new Array(Math.ceil(initialRound.length / 2)).fill(null).map(() => ({
      teamA: null,
      teamB: null,
      matchId: null,
    }));
    const rounds: BracketMatch[][] = [initialRound, nextRound];

    this.bracketRounds = rounds;
    this.roundLabels = this.getRoundLabels();
    // reset winners map
    this.winners.set({});
    // draw connectors after DOM updates
    setTimeout(() => this.drawConnectors(), 50);
  }

  // select winner in a given round and match index; for round 0 update winners map and advance to next column
  selectWinnerRound(roundIndex: number, matchIndex: number, team: any): void {
    if (this.modalidadIsClosed(this.selectedModalidadId())) return;
    if (roundIndex !== 0) return;
    const rounds: BracketMatch[][] = this.bracketRounds || [];
    if (!rounds[roundIndex]) return;
    if (!team?.id) return;

    const chosen = team;
    const match = rounds[roundIndex][matchIndex];
    if (!match) return;

    const winnerKey = this.getWinnerKey(roundIndex, matchIndex, match.matchId);
    const current = { ...this.winners() };
    const nextRound = rounds[roundIndex + 1];

    if (current[winnerKey] === chosen.id) {
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
      current[winnerKey] = chosen.id;
      if (nextRound) {
        const nextIdx = Math.floor(matchIndex / 2);
        const slot = nextRound[nextIdx];
        if (slot) {
          const winnerTeam: BracketTeam = {
            id: chosen.id,
            name: chosen.name,
            flagUrl: chosen.flagUrl,
          };
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
      // clear svg
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const rounds = this.bracketRounds || [];
      for (let r = 0; r < rounds.length - 1; r++) {
        const col = container.querySelectorAll(`[data-round='${r}']`);
        const nextCol = container.querySelectorAll(`[data-round='${r+1}']`);
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
          // color green if source match has a winner
          const winnerKey = this.getWinnerKey(r, idx, rounds[r]?.[idx]?.matchId);
          const hasWinner = this.winners()[winnerKey] !== undefined;
          ns.setAttribute('stroke', hasWinner ? '#00c853' : 'rgba(255,255,255,0.12)');
          ns.setAttribute('stroke-width', '3');
          ns.setAttribute('fill', 'none');
          ns.setAttribute('class', hasWinner ? 'connector draw active' : 'connector draw');
          svg.appendChild(ns);
        });
      }
    } catch (e) {
      // silent
    }
  }

  private toBracketTeam(teamId: any, teamName: any): BracketTeam | null {
    const name = String(teamName ?? '').trim();
    const rawId = teamId ?? name;
    const id: string | number =
      typeof rawId === 'string' || typeof rawId === 'number'
        ? rawId
        : String(rawId ?? '');
    if (!name && (id === null || id === undefined || id === '')) {
      return null;
    }

    const equipo = this.findEquipo(teamId, name);
    return {
      id,
      name: name || equipo?.name || `Equipo ${id}`,
      flagUrl: (equipo?.flagUrl as string | undefined) ?? undefined,
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

  private findEquipo(teamId: any, teamName: string): Equipo | undefined {
    const all = this.equipos() ?? [];
    if (teamId !== null && teamId !== undefined && teamId !== '') {
      const byId = all.find((e) => String(e.id) === String(teamId));
      if (byId) return byId;
    }
    if (!teamName) return undefined;
    const target = teamName.toLowerCase().trim();
    return all.find((e) => String(e.name ?? '').toLowerCase().trim() === target);
  }

  private getWinnerKey(roundIndex: number, matchIndex: number, matchId: string | number | null): string {
    if (matchId !== null && matchId !== undefined && matchId !== '') {
      return String(matchId);
    }
    return `r${roundIndex}-m${matchIndex}`;
  }

  private getRoundLabels(): string[] {
    const selectedRaw = String(this.extractId(this.selectedFase(), ['NombreFase', 'Nombre', 'nombre', 'name']) ?? 'Fase');
    const selectedNormalized = this.normalizeText(selectedRaw);

    if (selectedNormalized.includes('dieciseis')) return ['Dieciseisavos', 'Octavos'];
    if (selectedNormalized.includes('octav')) return ['Octavos', 'Cuartos'];
    if (selectedNormalized.includes('cuart')) return ['Cuartos', 'Semifinal'];
    if (selectedNormalized.includes('semi')) return ['Semifinal', 'Final'];
    if (selectedNormalized.includes('final')) return ['Final', 'Campeon'];

    return [selectedRaw, 'Siguiente fase'];
  }

  // redraw on resize
  private resizeHandler = () => this.drawConnectors();
  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }

  getModalidadById(id: number | null) {
    if (!id) return null;
    const list = this.modalidades() ?? [];
    for (const m of list) {
      if (Number(this.extractId(m, ['IdModalidad', 'id', 'Id'])) === Number(id)) return m;
    }
    return null;
  }

  modalidadIsClosed(modId: number | null): boolean {
    const m = this.getModalidadById(modId);
    if (!m) return false;
    const fecha = this.extractId(m, ['fechaDeCierre', 'FechaDeCierre', 'fechaCierre', 'FechaCierre']);
    if (!fecha) return false;
    try {
      return new Date() > new Date(fecha as string);
    } catch {
      return false;
    }
  }

  isFaseSelected(fase: any): boolean {
    const sel = this.selectedFase();
    if (!sel || !fase) return false;
    return Number(this.extractId(sel, ['IdFase', 'id', 'Id'])) === Number(this.extractId(fase, ['IdFase', 'id', 'Id']));
  }

  // Bracket interactions
  selectWinner(partido: any, teamId: string | number): void {
    if (this.modalidadIsClosed(this.selectedModalidadId())) return;
    const pId = this.extractId(partido, ['IdPartido', 'id', 'Id']) ?? JSON.stringify(partido);
    const current = { ...this.winners() };
    if (current[pId] === teamId) {
      delete current[pId];
    } else {
      current[pId] = teamId;
    }
    this.winners.set(current);
  }

  allWinnersSelected(): boolean {
    const partidos = this.partidos() ?? [];
    const winners = this.winners();
    return partidos.length > 0 && partidos.every((p) => {
      const pId = this.extractId(p, ['IdPartido', 'id', 'Id']) ?? JSON.stringify(p);
      return winners[pId] !== undefined && winners[pId] !== null;
    });
  }

  // Mis 4 selections
  toggleFour(teamId: string | number): void {
    if (this.modalidadIsClosed(9)) return;
    const current = [...this.selectedFour()];
    const idx = current.indexOf(teamId);
    if (idx >= 0) {
      current.splice(idx, 1);
      this.selectedFour.set(current);
      return;
    }
    if (current.length >= 4) {
      const message = 'Sólo puedes seleccionar 4 equipos.';
      this.error.set(message);
      this.showNotification('error', message);
      return;
    }
    current.push(teamId);
    this.selectedFour.set(current);
  }

  // Envíos separados según pestaña
  canSendFase(): boolean {
    if (this.modalidadIsClosed(this.selectedModalidadId())) return false;
    const modId = this.selectedModalidadId();
    // modalidad de grupos (1) uses existing hasSelections
    if (Number(modId) === 1) return this.hasSelections();
    // eliminatorias: require all winners
    return this.allWinnersSelected();
  }

  sendFasePredicciones(): void {
    if (!this.canSendFase()) return;
    const modId = this.selectedModalidadId() ?? this.DEFAULT_ID_MODALIDAD;

    if (Number(modId) === 1) {
      const predicciones: Prediccion[] = [];
      for (const ids of Object.values(this.selectedTeams())) {
        for (const id of ids ?? []) {
          predicciones.push({
            IdEquipo: Number(id),
            IdFase: Number(this.extractId(this.selectedFase(), ['IdFase', 'id']) ?? this.DEFAULT_ID_FASE),
            EsMejorTercero: this.isThirdSelected(id) ? 1 : 0,
          });
        }
      }
      for (const id of Object.values(this.selectedThirds())) {
        const exists = predicciones.some((p) => Number(p.IdEquipo) === Number(id));
        if (!exists) {
          predicciones.push({
            IdEquipo: Number(id),
            IdFase: Number(this.extractId(this.selectedFase(), ['IdFase', 'id']) ?? this.DEFAULT_ID_FASE),
            EsMejorTercero: 1,
          });
        }
      }

      this.sending.set(true);
      this.error.set(undefined);
      this.success.set(undefined);
      const usuarioId = this.userId() ?? this.DEFAULT_ID_USUARIO;
      this.servicio.registrarPredicciones(predicciones, usuarioId, modId).subscribe({
        next: () => {
          this.sending.set(false);
          this.success.set('Predicciones enviadas correctamente.');
        },
        error: (err: any) => {
          this.sending.set(false);
          this.error.set(err?.error?.message ?? 'Error al enviar predicciones.');
        },
      });
      return;
    }

    const winners = this.winners();
    const matchPredicciones: PartidoPrediccion[] = [];
    for (const p of this.partidos()) {
      const partidoId = this.extractId(p, ['IdPartido', 'id', 'Id']);
      if (partidoId === undefined || partidoId === null) continue;
      const partidoKey = String(partidoId);
      const winner = winners[partidoKey];
      if (winner !== undefined && winner !== null) {
        matchPredicciones.push({ IdPartido: Number(partidoId), IdEquipoGanador: Number(winner), IdModalidad: Number(modId) });
      }
    }

    this.sending.set(true);
    this.error.set(undefined);
    this.success.set(undefined);
    const usuarioId = this.userId() ?? this.DEFAULT_ID_USUARIO;
    this.servicio.registrarPrediccionesPartidos(matchPredicciones, usuarioId, modId).subscribe({
      next: () => {
        this.sending.set(false);
        this.success.set('Predicciones enviadas correctamente.');
        this.showNotification('success', 'Predicciones enviadas correctamente.');
      },
      error: (err: any) => {
        this.sending.set(false);
        const message = err?.error?.message ?? 'Error al enviar predicciones.';
        this.error.set(message);
        this.showNotification('error', message);
      },
    });
  }

  sendMis4Predicciones(): void {
    if (this.modalidadIsClosed(9)) return;
    if ((this.selectedFour().length ?? 0) !== 4) {
      const message = 'Selecciona exactamente 4 equipos.';
      this.error.set(message);
      this.showNotification('error', message);
      return;
    }
    const predicciones: Prediccion[] = this.selectedFour().map((id) => ({ IdEquipo: Number(id), IdFase: this.DEFAULT_ID_FASE, EsMejorTercero: 0 }));
    this.sending.set(true);
    this.error.set(undefined);
    this.success.set(undefined);
    const usuarioId = this.userId() ?? this.DEFAULT_ID_USUARIO;
    this.servicio.registrarPredicciones(predicciones, usuarioId, 9).subscribe({
      next: () => {
        this.sending.set(false);
        this.success.set('Mis 4 selecciones enviadas correctamente.');
        this.showNotification('success', 'Mis 4 selecciones enviadas correctamente.');
      },
      error: (err: any) => {
        this.sending.set(false);
        const message = err?.error?.message ?? 'Error al enviar predicciones.';
        this.error.set(message);
        this.showNotification('error', message);
      },
    });
  }

  toggleTeam(group: string, teamId: string | number): void {
    const current = { ...this.selectedTeams() };
    const selected = [...(current[group] ?? [])];
    const index = selected.indexOf(teamId);

    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      if (selected.length >= 2) {
        return;
      }
      selected.push(teamId);
    }

    current[group] = selected;
    this.selectedTeams.set(current);
    // Si este equipo estaba marcado como mejor tercero, quitarlo
    const thirds = { ...this.selectedThirds() };
    if (thirds[group] === teamId) {
      delete thirds[group];
      this.selectedThirds.set(thirds);
    }
  }

  toggleThird(group: string, teamId: string | number): void {
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

  isThirdSelected(teamId: string | number): boolean {
    return Object.values(this.selectedThirds()).includes(teamId);
  }

  thirdCount(): number {
    return Object.keys(this.selectedThirds()).length;
  }

  isSelected(group: string, teamId: string | number): boolean {
    return (this.selectedTeams()[group] ?? []).includes(teamId);
  }

  selectedCount(group: string): number {
    return (this.selectedTeams()[group] ?? []).length;
  }

  teamLabel(equipo: Equipo): string {
    return (
      equipo.name ??
      (equipo as any).nombre ??
      (equipo as any).team ??
      `Equipo ${equipo.id ?? ''}`
    );
  }

  enviarPredicciones(): void {
    if (!this.hasSelections()) {
      return;
    }

    const predicciones: Prediccion[] = [];

    for (const ids of Object.values(this.selectedTeams())) {
      for (const id of ids ?? []) {
        predicciones.push({
          IdEquipo: Number(id),
          IdFase: this.DEFAULT_ID_FASE,
          EsMejorTercero: this.isThirdSelected(id) ? 1 : 0,
        });
      }
    }

    for (const id of Object.values(this.selectedThirds())) {
      const exists = predicciones.some((p) => Number(p.IdEquipo) === Number(id));
      if (!exists) {
        predicciones.push({
          IdEquipo: Number(id),
          IdFase: this.DEFAULT_ID_FASE,
          EsMejorTercero: 1,
        });
      }
    }

    this.sending.set(true);
    this.success.set(undefined);

    this.servicio
      .registrarPredicciones(predicciones, this.DEFAULT_ID_USUARIO, this.DEFAULT_ID_MODALIDAD)
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.success.set('Predicciones enviadas correctamente.');
        },
        error: () => {
          this.sending.set(false);
          this.error.set('Error al enviar predicciones.');
        },
      });
  }
}
