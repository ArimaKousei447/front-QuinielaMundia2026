import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const primerLoginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.getPrimerLogin()) {
    router.navigateByUrl('/cambiar-password');
    return false;
  }
  return true;
};
