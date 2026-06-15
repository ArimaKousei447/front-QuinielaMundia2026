import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-cambiar-contrasena',
  imports: [FormsModule],
  templateUrl: './cambiar-contrasena.html',
  styleUrls: ['./cambiar-contrasena.css'],
})
export class CambiarContrasena {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  contrasenaActual = signal('');
  contrasenaNueva = signal('');
  confirmarContrasena = signal('');
  loading = signal(false);
  error = signal<string | undefined>(undefined);
  success = signal<string | undefined>(undefined);

  get usuarioNombre(): string | null {
    return this.auth.getUserName();
  }

  submit(): void {
    this.error.set(undefined);
    this.success.set(undefined);

    if (!this.contrasenaActual() || !this.contrasenaNueva() || !this.confirmarContrasena()) {
      this.error.set('Todos los campos son obligatorios.');
      return;
    }
    if (this.contrasenaNueva() !== this.confirmarContrasena()) {
      this.error.set('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (this.contrasenaNueva().length < 6) {
      this.error.set('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const idUsuario = this.auth.getUserId();
    if (!idUsuario) {
      this.error.set('Sesión no válida. Por favor inicia sesión de nuevo.');
      return;
    }

    this.loading.set(true);
    this.auth.cambiarPassword(idUsuario, this.contrasenaActual(), this.contrasenaNueva()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.hasError) {
          this.error.set(response.errors?.[0]?.descripcion ?? 'Error al cambiar contraseña.');
          return;
        }
        this.auth.actualizarPrimerLogin();
        this.success.set(response.data?.mensaje ?? 'Contraseña actualizada correctamente.');
        setTimeout(() => this.router.navigateByUrl('/home'), 1500);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error al conectar con el servidor.');
      },
    });
  }
}
