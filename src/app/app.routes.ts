import { Routes } from '@angular/router';
import { PaginaPrincipal } from '../app/components/pagina-principal/pagina-principal';
import { Login } from './components/login/login';
import { CambiarContrasena } from './components/cambiar-contrasena/cambiar-contrasena';
import { AdminResultados } from './components/admin-resultados/admin-resultados';
import { authGuard } from './services/auth.guard';
import { primerLoginGuard } from './services/primer-login.guard';
import { adminGuard } from './services/admin.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'cambiar-password', component: CambiarContrasena, canActivate: [authGuard] },
  { path: 'home', component: PaginaPrincipal, canActivate: [authGuard, primerLoginGuard] },
  { path: 'admin/resultados', component: AdminResultados, canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: '' },
];
