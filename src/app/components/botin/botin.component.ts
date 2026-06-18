import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ServiciosQuiniela } from '../../services/servicios-quiniela';
import { Botin } from '../../models/quiniela.models';

@Component({
  standalone: true,
  selector: 'app-botin',
  imports: [],
  templateUrl: './botin.component.html',
  styleUrls: ['./botin.component.css'],
})
export class BotinComponent {
  private readonly servicio = inject(ServiciosQuiniela);

  private readonly PCT_PRIMERO = 0.50;
  private readonly PCT_SEGUNDO = 0.30;
  private readonly PCT_TERCERO = 0.20;

  botines = signal<Botin[]>([]);
  loading = signal(true);
  error = signal<string | undefined>(undefined);

  constructor() {
    this.loadBotin();
  }

  loadBotin(): void {
    this.loading.set(true);
    this.error.set(undefined);
    this.servicio.getBotin().subscribe({
      next: (r) => {
        this.loading.set(false);
        if (r.hasError) {
          this.error.set(r.errors?.[0]?.descripcion ?? 'Error al cargar el botín.');
          return;
        }
        this.botines.set(r.data ?? []);
      },
      error: (httpError: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpError?.error?.errors?.[0]?.descripcion ?? 'Error al conectar con el servidor.');
      },
    });
  }

  formatMonto(value: number): string {
    return 'L. ' + value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  primero(monto: number): string { return this.formatMonto(monto * this.PCT_PRIMERO); }
  segundo(monto: number): string { return this.formatMonto(monto * this.PCT_SEGUNDO); }
  tercero(monto: number): string { return this.formatMonto(monto * this.PCT_TERCERO); }
}

// ✓ Actualizado — botin.component.ts
