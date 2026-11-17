import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).authorized()) return true;
  return inject(Router).createUrlTree(['/cargando'], { queryParams: { volver: state.url } });
};
