import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Redirige la raíz a la pantalla de inicio según el rol del usuario
export const homeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return router.createUrlTree([authService.homeUrl()]);
};
