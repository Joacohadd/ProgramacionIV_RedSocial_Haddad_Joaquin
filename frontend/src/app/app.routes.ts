import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'publicaciones' },
  { path: 'login', loadComponent: () => import('./pages/login.page').then(component => component.LoginPage) },
  { path: 'registro', loadComponent: () => import('./pages/register.page').then(component => component.RegisterPage) },
  { path: 'recuperar-contrasena', loadComponent: () => import('./pages/password-recovery.page').then(component => component.PasswordRecoveryPage) },
  { path: 'restablecer-contrasena', loadComponent: () => import('./pages/password-recovery.page').then(component => component.PasswordResetPage) },
  { path: 'publicaciones', loadComponent: () => import('./pages/feed.page').then(component => component.FeedPage), canActivate: [authGuard] },
  { path: 'mi-perfil', loadComponent: () => import('./pages/profile.page').then(component => component.ProfilePage), canActivate: [authGuard] },
  { path: '**', redirectTo: 'publicaciones' },
];
