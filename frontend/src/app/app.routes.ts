import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'cargando' },
  { path: 'cargando', loadComponent: () => import('./pages/session-loading.page').then(component => component.SessionLoadingPage) },
  { path: 'login', loadComponent: () => import('./pages/login.page').then(component => component.LoginPage) },
  { path: 'registro', loadComponent: () => import('./pages/register.page').then(component => component.RegisterPage) },
  { path: 'recuperar-contrasena', loadComponent: () => import('./pages/password-recovery.page').then(component => component.PasswordRecoveryPage) },
  { path: 'restablecer-contrasena', loadComponent: () => import('./pages/password-recovery.page').then(component => component.PasswordResetPage) },
  { path: 'publicaciones', loadComponent: () => import('./pages/feed.page').then(component => component.FeedPage), canActivate: [authGuard] },
  { path: 'publicaciones/:id', loadComponent: () => import('./pages/post-detail.page').then(component => component.PostDetailPage), canActivate: [authGuard] },
  { path: 'mi-perfil', loadComponent: () => import('./pages/profile.page').then(component => component.ProfilePage), canActivate: [authGuard] },
  { path: 'dashboard/usuarios', loadComponent: () => import('./pages/admin/users.page').then(component => component.AdminUsersPage), canActivate: [authGuard, adminGuard] },
  { path: 'dashboard/estadisticas', loadComponent: () => import('./pages/admin/stats.page').then(component => component.AdminStatsPage), canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: 'publicaciones' },
];
