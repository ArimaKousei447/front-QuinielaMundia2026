import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ServiciosQuiniela } from '../../services/servicios-quiniela';
import { Equipo, Fase, Partido } from '../../models/quiniela.models';

@Component({
  standalone: true,
  selector: 'app-admin-resultados',
  imports: [FormsModule],
  templateUrl: './admin-resultados.html',
  styleUrls: ['./admin-resultados.css'],
})
export class AdminResultados {
  private readonly servicio = inject(ServiciosQuiniela);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  activeSection = signal<'partido' | 'grupos' | 'consolidar'>('partido');

  // Datos cargados
  fases = signal<Fase[]>([]);
  equipos = signal<Equipo[]>([]);
  partidos = signal<Partido[]>([]);

  // Formulario: registrar resultado de partido
  selectedPartidoId = signal<number | null>(null);
  selectedGanadorId = signal<number | null>(null);

  // Formulario: registrar resultados de grupos
  grupoNombre = signal('');
  grupo1erEquipoId = signal<number | null>(null);
  grupo2doEquipoId = signal<number | null>(null);

  loading = signal(false);
  loadingPartidos = signal(false);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  private notifTimer: number | null = null;

  selectedPartido = computed(() =>
    this.partidos().find(p => p.IdPartido === this.selectedPartidoId()) ?? null
  );

  gruposDisponibles = computed(() => {
    const seen = new Set<string>();
    for (const e of this.equipos()) {
      if (e.Grupo) seen.add(e.Grupo);
    }
    return Array.from(seen).sort();
  });

  equiposDelGrupo = computed(() => {
    const g = this.grupoNombre();
    if (!g) return [];
    return this.equipos().filter(e => e.Grupo === g);
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.servicio.getFases().subscribe({
      next: (r) => { if (!r.hasError) this.fases.set(r.data ?? []); },
      error: () => {},
    });
    this.servicio.getEquipos().subscribe({
      next: (r) => { if (!r.hasError) this.equipos.set(r.data ?? []); },
      error: () => {},
    });
    this.loadPartidos();
  }

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
      },
      error: () => {
        this.loading.set(false);
        this.notify('error', 'Error al conectar con el servidor.');
      },
    });
  }

  registrarResultadosGrupos(): void {
    const grupo = this.grupoNombre();
    const eq1 = this.grupo1erEquipoId();
    const eq2 = this.grupo2doEquipoId();
    if (!grupo || !eq1 || !eq2) {
      this.notify('error', 'Completa todos los campos del grupo.');
      return;
    }
    if (eq1 === eq2) {
      this.notify('error', 'Los dos equipos clasificados deben ser distintos.');
      return;
    }
    this.loading.set(true);
    this.servicio.registrarResultadosGrupos([{ IdGrupo: grupo, IdEquipo1: eq1, IdEquipo2: eq2 }]).subscribe({
      next: (r) => {
        this.loading.set(false);
        if (r.hasError) {
          this.notify('error', r.errors?.[0]?.descripcion ?? 'Error al registrar resultados de grupo.');
          return;
        }
        this.notify('success', r.data?.mensaje ?? 'Resultados de grupo registrados.');
        this.grupoNombre.set('');
        this.grupo1erEquipoId.set(null);
        this.grupo2doEquipoId.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.notify('error', 'Error al conectar con el servidor.');
      },
    });
  }

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
      error: () => {
        this.loading.set(false);
        this.notify('error', 'Error al conectar con el servidor.');
      },
    });
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
