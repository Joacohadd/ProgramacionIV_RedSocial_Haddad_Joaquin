import { Component, DestroyRef, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { errorMessage } from '../core/services/http-error';

const warningBefore = 5 * 60_000;

function expiresAt(token: string): number | undefined {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : undefined;
  } catch { return undefined; }
}

@Component({
  selector: 'app-session-reminder',
  standalone: true,
  templateUrl: './session-reminder.html',
})
export class SessionReminder {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly dismissedToken = signal<string | null>(null);
  readonly minutes = signal(5);
  readonly renewing = signal(false);
  readonly error = signal('');

  constructor() {
    effect(onCleanup => {
      const token = this.auth.authorized() ? this.auth.session()?.token : undefined;
      const dialog = this.dialog()?.nativeElement;
      const dismissed = this.dismissedToken() === token;
      const expiration = token ? expiresAt(token) : undefined;
      if (!dialog) return;
      if (!token || expiration === undefined) {
        if (dialog.open) dialog.close();
        return;
      }

      let timer: ReturnType<typeof setTimeout>;
      const sync = () => {
        clearTimeout(timer);
        if (this.auth.session()?.token !== token) return;
        const remaining = expiration - Date.now();
        if (remaining <= 0) {
          if (dialog.open) dialog.close();
          this.auth.clear();
          void this.router.navigateByUrl('/login', { replaceUrl: true });
          return;
        }

        if (!dismissed && remaining <= warningBefore) {
          this.minutes.set(Math.ceil(remaining / 60_000));
          if (!dialog.open) dialog.showModal();
          timer = setTimeout(sync, (remaining % 60_000 || 60_000) + 1);
        } else {
          if (dialog.open) dialog.close();
          timer = setTimeout(sync, Math.min(dismissed ? remaining : remaining - warningBefore, 2_147_483_647));
        }
      };

      sync();
      document.addEventListener('visibilitychange', sync);
      window.addEventListener('focus', sync);
      onCleanup(() => {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', sync);
        window.removeEventListener('focus', sync);
      });
    });
  }

  dismiss(event?: Event) {
    event?.preventDefault();
    if (this.renewing()) return;
    this.error.set('');
    this.dismissedToken.set(this.auth.session()?.token ?? null);
  }

  extend() {
    const token = this.auth.session()?.token;
    if (!token || this.renewing()) return;

    this.renewing.set(true);
    this.error.set('');
    this.auth.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: session => {
        if (this.auth.session()?.token === token) this.auth.save(session);
        this.renewing.set(false);
      },
      error: error => {
        if (this.auth.session()?.token === token) this.error.set(errorMessage(error));
        this.renewing.set(false);
      },
    });
  }
}
