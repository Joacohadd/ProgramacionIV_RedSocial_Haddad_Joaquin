import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { errorMessage } from '../core/services/http-error';
import { AuthVisual } from '../shared/ui';

@Component({ standalone: true, imports: [ReactiveFormsModule, RouterLink, AuthVisual], templateUrl: './login.page.html' })
export class LoginPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly loading = signal(false); readonly error = signal(''); readonly showPassword = signal(false);
  readonly form = this.fb.group({ identifier: ['', Validators.required], password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)]] });
  submit() {
    this.form.markAllAsTouched(); if (this.form.invalid || this.loading()) return;
    this.loading.set(true); this.error.set('');
    const { identifier, password } = this.form.getRawValue();
    this.auth.login(identifier, password).subscribe({ next: session => { this.auth.save(session); void this.router.navigateByUrl('/publicaciones'); },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); } });
  }
}
