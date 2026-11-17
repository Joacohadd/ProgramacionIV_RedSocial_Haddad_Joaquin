import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../config/api-url';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!request.url.startsWith(`${API_URL}/`)) return next(request);
  const token = auth.session()?.token;
  const outgoing = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(outgoing).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401 && token && auth.session()?.token === token && !request.url.endsWith('/auth/login')) {
      auth.clear(); void router.navigateByUrl('/login', { replaceUrl: true });
    }
    return throwError(() => error);
  }));
};
