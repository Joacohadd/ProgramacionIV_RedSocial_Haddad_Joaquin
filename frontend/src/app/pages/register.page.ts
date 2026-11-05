import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { errorMessage } from '../core/services/http-error';
import { AuthVisual } from '../shared/ui';
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '../core/config/api-url';

@Component({ standalone: true, imports: [ReactiveFormsModule, RouterLink, AuthVisual], templateUrl: './register.page.html' })
export class RegisterPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly today = new Date().toISOString().slice(0, 10);
  readonly loading = signal(false); readonly error = signal(''); readonly avatarName = signal('');
  private avatar: File | null = null;
  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/\S/)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]{3,24}$/)]],
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)]],
    repetirPassword: ['', Validators.required], fechaNacimiento: ['', Validators.required],
    bio: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(280), Validators.pattern(/\S/)]],
  });
  invalid(name: string) { const control = this.form.get(name); return !!control?.invalid && !!control.touched; }
  mismatch() { const { password, repetirPassword } = this.form.getRawValue(); return !!repetirPassword && password !== repetirPassword; }
  chooseFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (file && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > MAX_IMAGE_BYTES)) {
      this.error.set(`La foto debe ser JPG, PNG, WebP o GIF y pesar hasta ${MAX_IMAGE_MB} MB.`); this.avatar = null; this.avatarName.set(''); return;
    }
    this.error.set(''); this.avatar = file; this.avatarName.set(file?.name || '');
  }
  submit() {
    this.form.markAllAsTouched(); if (this.form.invalid || this.mismatch() || this.loading()) return;
    const data = new FormData(); const values = this.form.getRawValue();
    for (const [key, value] of Object.entries(values)) data.append(key, value);
    if (this.avatar) data.append('avatar', this.avatar);
    this.loading.set(true); this.error.set('');
    this.auth.register(data).subscribe({ next: session => { this.auth.save(session); void this.router.navigateByUrl('/publicaciones'); },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); } });
  }
}
