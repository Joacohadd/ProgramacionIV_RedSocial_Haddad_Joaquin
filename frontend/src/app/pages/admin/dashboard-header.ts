import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-dashboard-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="dashboard-banner">
      <p class="dashboard-eyebrow">Administración</p>
      <h1>{{ title() }}<span aria-hidden="true">.</span></h1>
      <nav class="dashboard-tabs" aria-label="Panel de administración">
        <a routerLink="/dashboard/usuarios" routerLinkActive="selected" ariaCurrentWhenActive="page">Usuarios</a>
        <a routerLink="/dashboard/estadisticas" routerLinkActive="selected" ariaCurrentWhenActive="page">Estadísticas</a>
      </nav>
    </div>
  `,
})
export class DashboardHeader {
  readonly title = input.required<string>();
}
