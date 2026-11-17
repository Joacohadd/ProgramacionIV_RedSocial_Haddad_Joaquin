import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  standalone: true,
  template: `
    <main class="session-loading">
      <section class="session-ticket" aria-labelledby="session-loading-title">
        @if (error()) {
          <h1 id="session-loading-title">No pudimos conectar.</h1>
          <p role="alert">La sesión se va a verificar cuando el servidor vuelva a responder.</p>
          <button type="button" class="primary-button" (click)="check()">Reintentar</button>
        } @else {
          <span class="loading-orbit" aria-hidden="true"></span>
          <h1 id="session-loading-title">Abriendo <em>Trama.</em></h1>
          <p role="status">Estamos verificando tu sesión.</p>
        }
      </section>
    </main>
  `,
})
export class SessionLoadingPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly error = signal(false);

  constructor() {
    afterNextRender(() => this.check());
  }

  check() {
    this.error.set(false);
    const session = this.auth.session();
    if (!session) {
      this.go('/login');
      return;
    }

    const requested = this.route.snapshot.queryParamMap.get('volver') ?? '';
    const destination = /^\/(mi-perfil|publicaciones(?:\/[a-f\d]{24})?)$/i.test(requested)
      ? requested : '/publicaciones';
    if (this.auth.authorized()) {
      this.go(destination);
      return;
    }

    this.auth.authorize().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: user => {
        if (this.auth.session()?.token !== session.token) return;
        this.auth.save({ user, token: session.token });
        this.go(destination);
      },
      error: error => {
        // El interceptor se ocupa del 401; un error de red permite reintentar.
        if (error.status !== 401) this.error.set(true);
      },
    });
  }

  private go(url: string) {
    void this.router.navigateByUrl(url, { replaceUrl: true });
  }
}
