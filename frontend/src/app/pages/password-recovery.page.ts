import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { errorMessage } from '../core/services/http-error';
import { AuthVisual } from '../shared/ui';

@Component({ standalone: true, imports: [ReactiveFormsModule, RouterLink, AuthVisual], templateUrl: './password-recovery.page.html' })
export class PasswordRecoveryPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly localDelivery = signal(false);
  readonly error = signal('');
  readonly form = this.fb.group({ identifier: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(254)]] });

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.auth.requestPasswordReset(this.form.controls.identifier.value.trim()).subscribe({
      next: result => { this.localDelivery.set(result.delivery === 'local'); this.sent.set(true); this.loading.set(false); },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); },
    });
  }
}

@Component({ standalone: true, imports: [ReactiveFormsModule, RouterLink, AuthVisual], templateUrl: './password-reset.page.html' })
export class PasswordResetPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly token = this.route.snapshot.queryParamMap.get('token') || '';
  readonly validLink = /^[a-f0-9]{64}$/.test(this.token);
  readonly loading = signal(false);
  readonly complete = signal(false);
  readonly error = signal('');
  readonly showPasswords = signal(false);
  readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)]],
    repetirPassword: ['', Validators.required],
  });

  mismatch() { const { password, repetirPassword } = this.form.getRawValue(); return !!repetirPassword && password !== repetirPassword; }
  submit() {
    this.form.markAllAsTouched();
    if (!this.validLink || this.form.invalid || this.mismatch() || this.loading()) return;
    this.loading.set(true); this.error.set('');
    const { password, repetirPassword } = this.form.getRawValue();
    this.auth.resetPassword(this.token, password, repetirPassword).subscribe({
      next: () => { this.auth.clear(); this.complete.set(true); this.loading.set(false); },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); },
    });
  }
}
