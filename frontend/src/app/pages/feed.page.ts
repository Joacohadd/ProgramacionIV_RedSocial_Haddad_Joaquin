import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Subscription } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { errorMessage } from '../core/services/http-error';
import { PostsService } from '../core/services/posts.service';
import { Post } from '../core/models';
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '../core/config/api-url';
import { Avatar, PostCard, SiteHeader } from '../shared/ui';

@Component({ standalone: true, imports: [ReactiveFormsModule, SiteHeader, PostCard, Avatar], templateUrl: './feed.page.html' })
export class FeedPage implements OnInit, OnDestroy {
  @ViewChild('postImageInput') private postImageInput?: ElementRef<HTMLInputElement>;
  @ViewChild('previewThumb') private previewThumb?: ElementRef<HTMLButtonElement>;
  @ViewChild('lightboxClose') private lightboxClose?: ElementRef<HTMLButtonElement>;
  @ViewChild('commentDialog', { static: true }) private commentDialog!: ElementRef<HTMLDialogElement>;
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('feedSentinel');
  private readonly destroyRef = inject(DestroyRef);
  readonly maxImageMb = MAX_IMAGE_MB;
  readonly auth = inject(AuthService); private readonly postsApi = inject(PostsService); private readonly fb = inject(FormBuilder).nonNullable;
  private readonly pageSize = 5;
  private feedRequest?: Subscription;
  private nextCursor: string | null = null;
  private readonly removed = new Set<string>();
  readonly posts = signal<Post[]>([]);
  readonly hasMore = signal(true);
  readonly sort = signal<'date' | 'likes'>('date'); readonly loading = signal(false); readonly error = signal(''); readonly busyId = signal('');
  readonly actionError = signal('');
  readonly showComposer = signal(false); readonly publishing = signal(false); readonly composerError = signal(''); readonly imageName = signal('');
  readonly imagePreviewUrl = signal<string | null>(null); readonly showImageLightbox = signal(false);
  readonly deleteTarget = signal<Post | null>(null); readonly toast = signal(''); private image: File | null = null;
  readonly commentTarget = signal<Post | null>(null);
  readonly commenting = signal(false);
  readonly commentError = signal('');
  readonly commentMaxLength = 1000;
  readonly commentForm = this.fb.group({
    message: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(this.commentMaxLength)]],
  });
  private toastTimer?: ReturnType<typeof setTimeout>;
  readonly draft = this.fb.group({ title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120), Validators.pattern(/\S/)]],
    description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3000), Validators.pattern(/\S/)]] });
  constructor() {
    effect(onCleanup => {
      const marker = this.sentinel()?.nativeElement;
      if (!marker || this.loading() || this.error() || !this.hasMore()) return;
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) this.load();
      }, { rootMargin: '0px 0px 240px' });
      observer.observe(marker);
      onCleanup(() => observer.disconnect());
    });
  }

  ngOnInit() { this.load(); }
  ngOnDestroy() {
    this.clearSelectedImage();
    clearTimeout(this.toastTimer);
  }
  load() {
    if (this.loading() || !this.hasMore()) return;
    this.loading.set(true);
    this.error.set('');
    this.feedRequest = this.postsApi.feed(this.sort(), this.pageSize, this.nextCursor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.posts.update(current => {
            const seen = new Set(current.map(post => post.id));
            return [...current, ...page.items.filter(post => !seen.has(post.id) && !this.removed.has(post.id))];
          });
          this.nextCursor = page.nextCursor;
          this.hasMore.set(page.nextCursor !== null);
          this.loading.set(false);
        },
        error: error => { this.error.set(errorMessage(error)); this.loading.set(false); },
      });
  }

  setSort(sort: 'date' | 'likes') {
    if (this.sort() === sort) return;
    this.feedRequest?.unsubscribe();
    this.sort.set(sort);
    this.posts.set([]);
    this.nextCursor = null;
    this.hasMore.set(true);
    this.loading.set(false);
    this.load();
  }
  openComposer() { this.showComposer.set(true); }
  closeComposer() {
    if (this.publishing()) return;
    this.clearSelectedImage(); this.draft.reset(); this.composerError.set(''); this.showComposer.set(false);
  }
  chooseImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      this.clearSelectedImage(); this.composerError.set(`La imagen debe ser JPG, PNG, WebP o GIF y pesar hasta ${MAX_IMAGE_MB} MB.`); return;
    }
    this.clearSelectedImage();
    this.image = file; this.imageName.set(file.name); this.imagePreviewUrl.set(URL.createObjectURL(file));
    this.composerError.set('');
  }
  clearSelectedImage() {
    const url = this.imagePreviewUrl(); if (url) URL.revokeObjectURL(url);
    this.imagePreviewUrl.set(null); this.showImageLightbox.set(false);
    this.image = null; this.imageName.set('');
    if (this.postImageInput) this.postImageInput.nativeElement.value = '';
  }
  openImageLightbox() {
    if (!this.imagePreviewUrl()) return;
    this.showImageLightbox.set(true);
    setTimeout(() => this.lightboxClose?.nativeElement.focus());
  }
  closeImageLightbox() {
    this.showImageLightbox.set(false);
    setTimeout(() => this.previewThumb?.nativeElement.focus());
  }
  publish() { this.draft.markAllAsTouched(); if (this.draft.invalid || this.publishing()) return;
    const data = new FormData(); const values = this.draft.getRawValue(); data.append('title', values.title.trim()); data.append('description', values.description.trim()); if (this.image) data.append('image', this.image);
    this.publishing.set(true); this.composerError.set(''); this.postsApi.create(data).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: post => {
        this.publishing.set(false);
        this.closeComposer();
        if (this.sort() === 'date') this.posts.update(items => [post, ...items.filter(item => item.id !== post.id)]);
        else this.setSort('date');
        this.flash('Tu publicación ya es parte de Trama.');
      },
      error: error => { this.composerError.set(errorMessage(error)); this.publishing.set(false); } }); }

  toggleLike(post: Post) {
    if (this.busyId()) return;
    this.busyId.set(post.id);
    this.actionError.set('');
    const action = post.likedByMe ? this.postsApi.unlike(post.id) : this.postsApi.like(post.id);
    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.posts.update(items => {
          const result = items.map(item => item.id === updated.id ? updated : item);
          return this.sort() === 'likes' ? result.sort((a, b) =>
            b.likesCount - a.likesCount || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)) : result;
        });
        this.busyId.set('');
      },
      error: error => { this.actionError.set(errorMessage(error)); this.busyId.set(''); },
    });
  }

  confirmDelete(post: Post) {
    if (this.busyId()) return;
    this.busyId.set(post.id);
    this.actionError.set('');
    this.postsApi.remove(post.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.removed.add(post.id);
        this.posts.update(items => items.filter(item => item.id !== post.id));
        this.busyId.set('');
        this.deleteTarget.set(null);
        this.flash('Publicación eliminada.');
      },
      error: error => { this.busyId.set(''); this.deleteTarget.set(null); this.actionError.set(errorMessage(error)); },
    });
  }

  openComment(post: Post) {
    if (this.commentDialog.nativeElement.open) return;
    this.commentForm.reset();
    this.commentError.set('');
    this.commentTarget.set(post);
    this.commentDialog.nativeElement.showModal();
  }

  closeComment(event?: Event) {
    event?.preventDefault();
    if (this.commenting()) return;
    this.commentDialog.nativeElement.close();
    this.commentTarget.set(null);
  }

  publishComment() {
    const post = this.commentTarget();
    this.commentForm.markAllAsTouched();
    if (!post || this.commentForm.invalid || this.commenting()) return;

    this.commenting.set(true);
    this.commentError.set('');
    this.postsApi.comment(post.id, this.commentForm.controls.message.value.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.commenting.set(false);
          this.closeComment();
          this.flash('Comentario publicado.');
        },
        error: error => {
          this.commenting.set(false);
          this.commentError.set(errorMessage(error));
        },
      });
  }

  private flash(message: string) {
    clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(''), 4000);
  }
}
