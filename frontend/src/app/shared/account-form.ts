import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '../core/config/api-url';
import type { User } from '../core/models';
import { InitialFocusDirective } from './trama-directives';

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule, InitialFocusDirective],
  templateUrl: './account-form.html',
})
export class AccountForm {
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly administrative = input(false);
  readonly saving = input(false);
  readonly requestError = input('');
  readonly save = output<FormData>();
  readonly today = new Date().toISOString().slice(0, 10);
  readonly avatarName = signal('');
  readonly avatarError = signal('');
  private avatar: File | null = null;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/\S/)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]{3,24}$/)]],
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)]],
    repetirPassword: ['', Validators.required],
    fechaNacimiento: ['', Validators.required],
    bio: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(280), Validators.pattern(/\S/)]],
    role: this.fb.control<User['role']>('usuario'),
  });

  invalid(name: keyof typeof this.form.controls) {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  mismatch() {
    const { password, repetirPassword } = this.form.getRawValue();
    return !!repetirPassword && password !== repetirPassword;
  }

  chooseFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.avatarError.set('');
    this.avatar = null;
    this.avatarName.set('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      this.avatarError.set(`La foto debe ser JPG, PNG, WebP o GIF y pesar hasta ${MAX_IMAGE_MB} MB.`);
      input.value = '';
      return;
    }
    this.avatar = file;
    this.avatarName.set(file.name);
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.mismatch() || this.saving()) return;
    const { role, ...fields } = this.form.getRawValue();
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.append(key, value);
    if (this.administrative()) data.append('role', role);
    if (this.avatar) data.append('avatar', this.avatar);
    this.save.emit(data);
  }
}
