import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, of, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { errorMessage } from '../core/services/http-error';
import { PostsService } from '../core/services/posts.service';
import { Post, PublicProfile } from '../core/models';
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '../core/config/api-url';
import { Avatar, PostCard, SiteHeader } from '../shared/ui';

@Component({ standalone: true, imports: [DatePipe, ReactiveFormsModule, RouterLink, SiteHeader, Avatar, PostCard], templateUrl: './profile.page.html' })
export class ProfilePage implements OnInit, OnDestroy {
  @ViewChild('editTrigger') private editTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('editName') private editName?: ElementRef<HTMLInputElement>;
  private readonly deleteDialog = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDialog');
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reloadPosts = new Subject<void>();
  private readonly targetId = signal<string | null>(null);
  private readonly otherProfile = signal<PublicProfile | null>(null);
  readonly auth = inject(AuthService); private readonly postsApi = inject(PostsService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly posts = signal<Post[]>([]); readonly loading = signal(false); readonly error = signal(''); readonly busyId = signal('');
  readonly isOwn = computed(() => !this.targetId() || this.auth.user()?.id === this.targetId());
  readonly profile = computed(() => this.isOwn() ? this.auth.user() : this.otherProfile());
  readonly deleteTarget = signal<Post | null>(null);
  readonly actionError = signal('');
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
  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.targetId.set(params.get('id')?.toLowerCase() ?? null);
        this.otherProfile.set(null);
        this.posts.set([]);
        this.actionError.set('');
        return this.reloadPosts.pipe(startWith(undefined), switchMap(() => this.loadProfilePosts()));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(page => {
      this.posts.set(page.items);
      this.loading.set(false);
    });
  }

  ngOnDestroy() { this.releaseAvatarPreview(); }
  load() { this.reloadPosts.next(); }

  private loadProfilePosts() {
    const saved = this.profile();
    const id = this.targetId();
    if (!saved && !id) return EMPTY;
    this.loading.set(true);
    this.error.set('');
    // Reutilizar los datos al recargar las publicaciones mantiene una visita por apertura.
    const profile$ = saved ? of(saved) : this.auth.profile(id!).pipe(tap(user => this.otherProfile.set(user)));
    return profile$.pipe(
      switchMap(user => this.postsApi.list({ sort: 'date', offset: 0, limit: 3, userId: user.id })),
      catchError(error => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
        return EMPTY;
      }),
    );
  }

  toggleLike(post: Post) {
    if (this.busyId()) return;
    this.busyId.set(post.id);
    this.actionError.set('');
    const action = post.likedByMe ? this.postsApi.unlike(post.id) : this.postsApi.like(post.id);
    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.posts.update(items => items.map(item => item.id === updated.id ? updated : item));
        this.busyId.set('');
      },
      error: error => { this.actionError.set(errorMessage(error)); this.busyId.set(''); },
    });
  }

  askToDelete(post: Post) {
    if (this.busyId()) return;
    this.actionError.set('');
    this.deleteTarget.set(post);
    this.deleteDialog().nativeElement.showModal();
  }

  closeDelete(event?: Event) {
    event?.preventDefault();
    if (this.busyId()) return;
    this.deleteDialog().nativeElement.close();
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const post = this.deleteTarget();
    if (!post || this.busyId()) return;
    this.busyId.set(post.id);
    this.postsApi.remove(post.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.posts.update(items => items.filter(item => item.id !== post.id));
        this.busyId.set('');
        this.closeDelete();
        this.load();
      },
      error: error => { this.busyId.set(''); this.closeDelete(); this.actionError.set(errorMessage(error)); },
    });
  }
  invalid(name: string) { const control = this.editForm.get(name); return !!control?.invalid && !!control.touched; }
  openEditor() {
    const user = this.auth.user(); if (!user || !this.isOwn()) return;
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
    if (!this.isOwn() || this.editForm.invalid || this.saving()) return;
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
