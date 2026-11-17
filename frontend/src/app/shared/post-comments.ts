import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PostComment } from '../core/models';
import { AuthService } from '../core/services/auth.service';
import { errorMessage } from '../core/services/http-error';
import { PostsService } from '../core/services/posts.service';
import { Avatar } from './ui';

@Component({
  selector: 'app-post-comments',
  standalone: true,
  imports: [Avatar, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './post-comments.html',
})
export class PostComments implements OnInit {
  readonly postId = input.required<string>();
  readonly preview = input(false);
  private readonly posts = inject(PostsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  readonly comments = signal<PostComment[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly loadError = signal('');
  readonly posting = signal(false);
  readonly postError = signal('');
  readonly editingId = signal<string | null>(null);
  readonly savingEdit = signal(false);
  readonly editError = signal('');
  readonly maxLength = 1000;
  readonly message = this.messageControl();
  readonly editedMessage = this.messageControl();
  readonly composeForm = new FormGroup({ message: this.message });
  readonly editForm = new FormGroup({ message: this.editedMessage });
  private offset = 0;

  ngOnInit() { this.load(); }

  load() {
    if (this.loading() || this.posting()) return;
    this.loading.set(true);
    this.loadError.set('');
    this.posts.comments(this.postId(), this.offset, this.preview() ? 2 : 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.comments.update(current => {
            const seen = new Set(current.map(comment => comment.id));
            return [...current, ...page.items.filter(comment => !seen.has(comment.id))];
          });
          this.offset += page.items.length;
          this.hasMore.set(page.hasMore);
          this.loading.set(false);
        },
        error: error => {
          this.loadError.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }

  add() {
    this.message.markAsTouched();
    if (this.message.invalid || this.loading() || this.posting() || this.loadError()) return;
    this.postError.set('');
    this.posting.set(true);
    this.posts.comment(this.postId(), this.message.value.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: comment => {
          this.comments.update(current => [comment, ...current]);
          this.offset++;
          this.message.reset();
          this.posting.set(false);
        },
        error: error => {
          this.postError.set(errorMessage(error));
          this.posting.set(false);
        },
      });
  }

  startEdit(comment: PostComment) {
    if (this.savingEdit()) return;
    this.editedMessage.reset(comment.message);
    this.editError.set('');
    this.editingId.set(comment.id);
  }

  cancelEdit() {
    if (!this.savingEdit()) this.editingId.set(null);
  }

  saveEdit(comment: PostComment) {
    this.editedMessage.markAsTouched();
    if (this.editedMessage.invalid || this.savingEdit() || this.editingId() !== comment.id) return;
    this.editError.set('');
    this.savingEdit.set(true);
    this.posts.editComment(this.postId(), comment.id, this.editedMessage.value.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.comments.update(current => current.map(item => item.id === updated.id ? updated : item));
          this.editingId.set(null);
          this.savingEdit.set(false);
        },
        error: error => {
          this.editError.set(errorMessage(error));
          this.savingEdit.set(false);
        },
      });
  }

  private messageControl() {
    return new FormControl('', { nonNullable: true, validators: [
      Validators.required, Validators.pattern(/\S/), Validators.maxLength(this.maxLength),
    ] });
  }
}
