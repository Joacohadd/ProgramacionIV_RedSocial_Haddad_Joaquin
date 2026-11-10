import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'publicaciones' },
  { path: 'login', loadComponent: () => import('./pages/login.page').then(component => component.LoginPage) },
  { path: 'registro', loadComponent: () => import('./pages/register.page').then(component => component.RegisterPage) },
  { path: 'publicaciones', loadComponent: () => import('./pages/feed.page').then(component => component.FeedPage) },
  { path: 'mi-perfil', loadComponent: () => import('./pages/profile.page').then(component => component.ProfilePage) },
  { path: '**', redirectTo: 'publicaciones' },
];
