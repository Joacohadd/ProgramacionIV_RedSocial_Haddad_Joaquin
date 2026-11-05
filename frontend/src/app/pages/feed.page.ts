import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  readonly Math = Math;
  readonly maxImageMb = MAX_IMAGE_MB;
  readonly auth = inject(AuthService); private readonly postsApi = inject(PostsService); private readonly fb = inject(FormBuilder).nonNullable;
  readonly pageSize = 5; readonly posts = signal<Post[]>([]); readonly total = signal(0); readonly offset = signal(0);
  readonly sort = signal<'date' | 'likes'>('date'); readonly loading = signal(false); readonly error = signal(''); readonly busyId = signal('');
  readonly showComposer = signal(false); readonly publishing = signal(false); readonly composerError = signal(''); readonly imageName = signal('');
  readonly imagePreviewUrl = signal<string | null>(null); readonly showImageLightbox = signal(false);
  readonly deleteTarget = signal<Post | null>(null); readonly toast = signal(''); private image: File | null = null;
  private loadVersion = 0;
  readonly draft = this.fb.group({ title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120), Validators.pattern(/\S/)]],
    description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3000), Validators.pattern(/\S/)]] });
  ngOnInit() { this.load(); }
  ngOnDestroy() { this.clearSelectedImage(); }
  load() { const version = ++this.loadVersion; this.loading.set(true); this.error.set(''); this.postsApi.list({ sort: this.sort(), offset: this.offset(), limit: this.pageSize }).subscribe({
    next: page => { if (version !== this.loadVersion) return; this.posts.set(page.items); this.total.set(page.total); this.loading.set(false); },
    error: error => { if (version !== this.loadVersion) return; this.error.set(errorMessage(error)); this.loading.set(false); },
  }); }
  setSort(sort: 'date' | 'likes') { if (this.sort() === sort) return; this.sort.set(sort); this.offset.set(0); this.load(); }
  page(direction: number) { this.offset.update(value => Math.max(0, value + direction * this.pageSize)); this.load(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
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
    this.publishing.set(true); this.composerError.set(''); this.postsApi.create(data).subscribe({ next: () => { this.publishing.set(false); this.closeComposer(); this.sort.set('date'); this.offset.set(0); this.load(); this.flash('Tu publicación ya es parte de Trama.'); },
      error: error => { this.composerError.set(errorMessage(error)); this.publishing.set(false); } }); }
  toggleLike(post: Post) { this.busyId.set(post.id); const action = post.likedByMe ? this.postsApi.unlike(post.id) : this.postsApi.like(post.id);
    action.subscribe({ next: updated => { this.posts.update(items => items.map(item => item.id === updated.id ? updated : item)); this.busyId.set(''); if (this.sort() === 'likes') this.load(); },
      error: error => { this.error.set(errorMessage(error)); this.busyId.set(''); } }); }
  confirmDelete(post: Post) { this.busyId.set(post.id); this.postsApi.remove(post.id).subscribe({ next: () => { this.busyId.set(''); this.deleteTarget.set(null); if (this.offset() > 0 && this.posts().length === 1) this.offset.update(value => Math.max(0, value - this.pageSize)); this.load(); this.flash('Publicación eliminada.'); },
    error: error => { this.busyId.set(''); this.deleteTarget.set(null); this.error.set(errorMessage(error)); } }); }
  private flash(message: string) { this.toast.set(message); window.setTimeout(() => this.toast.set(''), 4000); }
}
