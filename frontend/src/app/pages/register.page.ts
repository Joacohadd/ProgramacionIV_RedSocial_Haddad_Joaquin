import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { errorMessage } from '../core/services/http-error';
import { AuthVisual } from '../shared/ui';
import { AccountForm } from '../shared/account-form';

@Component({ standalone: true, imports: [AccountForm, RouterLink, AuthVisual], templateUrl: './register.page.html' })
export class RegisterPage {
  private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly loading = signal(false); readonly error = signal('');
  submit(data: FormData) {
    if (this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.auth.register(data).subscribe({ next: session => { this.auth.save(session); void this.router.navigateByUrl('/publicaciones'); },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); } });
  }
}
