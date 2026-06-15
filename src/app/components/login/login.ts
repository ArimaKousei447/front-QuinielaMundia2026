import { CommonModule } from '@angular/common';
import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  isRegister = signal(false);
  loading = signal(false);
  error = signal<string | undefined>(undefined);

  // login form
  email = signal('');
  contrasena = signal('');

  // register form
  nombre = signal('');
  regEmail = signal('');
  regContrasena = signal('');

  toggleMode(): void {
    this.isRegister.set(!this.isRegister());
    this.error.set(undefined);
  }

  submitLogin(): void {
    this.loading.set(true);
    this.error.set(undefined);
    this.auth.login(this.email(), this.contrasena()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.hasError) {
          this.error.set(response.errors?.[0]?.descripcion ?? 'Error en inicio de sesión');
          return;
        }
        if (response.data?.primerLogin) {
          this.router.navigateByUrl('/cambiar-password');
        } else {
          this.router.navigateByUrl('/home');
        }
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Error en inicio de sesión');
      },
    });
  }

  submitRegister(): void {
    this.error.set('El registro de usuarios no está disponible en este momento.');
  }
}
