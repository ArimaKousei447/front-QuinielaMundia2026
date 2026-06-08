import { Routes } from '@angular/router';
import { PaginaPrincipal } from '../app/components/pagina-principal/pagina-principal';
import { Login } from './components/login/login';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'home', component: PaginaPrincipal, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
