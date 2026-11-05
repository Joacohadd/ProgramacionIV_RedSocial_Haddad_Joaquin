import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { errorMessage } from '../core/services/http-error';
import { PostsService } from '../core/services/posts.service';
import { Post } from '../core/models';
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '../core/config/api-url';
import { Avatar, PostCard, SiteHeader } from '../shared/ui';

@Component({ standalone: true, imports: [DatePipe, ReactiveFormsModule, RouterLink, SiteHeader, Avatar, PostCard], templateUrl: './profile.page.html' })
export class ProfilePage implements OnInit, OnDestroy {
  @ViewChild('editTrigger') private editTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('editName') private editName?: ElementRef<HTMLInputElement>;
  readonly auth = inject(AuthService); private readonly postsApi = inject(PostsService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly posts = signal<Post[]>([]); readonly loading = signal(false); readonly error = signal(''); readonly busyId = signal('');
  readonly editing = signal(false); readonly saving = signal(false); readonly editError = signal('');
  readonly saved = signal(false); readonly avatarName = signal(''); readonly avatarPreview = signal<string | null>(null);
  readonly today = new Date().toISOString().slice(0, 10);
  readonly maxImageMb = MAX_IMAGE_MB;
  private avatarFile: File | null = null;
  readonly editForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/\S/)]],
    apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]{3,24}$/)]],
    fechaNacimiento: ['', Validators.required],
    bio: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(280), Validators.pattern(/\S/)]],
  });
  ngOnInit() { this.load(); }
  ngOnDestroy() { this.releaseAvatarPreview(); }
  load() { const user = this.auth.user(); if (!user) return; this.loading.set(true); this.error.set('');
    this.postsApi.list({ sort: 'date', offset: 0, limit: 3, userId: user.id }).subscribe({
      next: page => { this.posts.set(page.items); this.loading.set(false); },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); },
    }); }
  toggleLike(post: Post) { this.busyId.set(post.id); const action = post.likedByMe ? this.postsApi.unlike(post.id) : this.postsApi.like(post.id);
    action.subscribe({ next: updated => { this.posts.update(items => items.map(item => item.id === updated.id ? updated : item)); this.busyId.set(''); },
      error: error => { this.error.set(errorMessage(error)); this.busyId.set(''); } }); }
  invalid(name: string) { const control = this.editForm.get(name); return !!control?.invalid && !!control.touched; }
  openEditor() {
    const user = this.auth.user(); if (!user) return;
    this.releaseAvatarPreview(); this.avatarFile = null; this.avatarName.set('');
    this.editError.set(''); this.saved.set(false);
    this.editForm.reset({ nombre: user.nombre, apellido: user.apellido, email: user.email,
      username: user.username, fechaNacimiento: user.fechaNacimiento.slice(0, 10), bio: user.bio });
    this.editing.set(true);
    setTimeout(() => this.editName?.nativeElement.focus());
  }
  closeEditor() {
    if (this.saving()) return;
    this.editing.set(false); this.releaseAvatarPreview(); this.avatarFile = null;
    setTimeout(() => this.editTrigger?.nativeElement.focus());
  }
  chooseAvatar(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      this.releaseAvatarPreview(); this.avatarFile = null; this.avatarName.set('');
      this.editError.set(`La foto debe ser JPG, PNG, WebP o GIF y pesar hasta ${MAX_IMAGE_MB} MB.`);
      input.value = ''; return;
    }
    this.releaseAvatarPreview();
    this.avatarFile = file; this.avatarName.set(file.name);
    this.avatarPreview.set(URL.createObjectURL(file)); this.editError.set('');
  }
  saveProfile() {
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid || this.saving()) return;
    const form = new FormData();
    for (const [key, value] of Object.entries(this.editForm.getRawValue())) form.append(key, value.trim());
    if (this.avatarFile) form.append('avatar', this.avatarFile);
    this.saving.set(true); this.editError.set('');
    this.auth.updateProfile(form).subscribe({
      next: user => { this.auth.updateUser(user); this.saving.set(false); this.closeEditor(); this.saved.set(true); this.load(); },
      error: error => { this.editError.set(errorMessage(error)); this.saving.set(false); },
    });
  }
  private releaseAvatarPreview() {
    const url = this.avatarPreview(); if (url) URL.revokeObjectURL(url);
    this.avatarPreview.set(null);
  }
}
