import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, inject, input, signal, viewChild } from '@angular/core';
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
  private readonly deleteDialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');
  private readonly newComment = viewChild<ElementRef<HTMLTextAreaElement>>('newComment');
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
  readonly deleteTarget = signal<PostComment | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');
  readonly notice = signal('');
  readonly maxLength = 1000;
  readonly message = this.messageControl();
  readonly editedMessage = this.messageControl();
  readonly composeForm = new FormGroup({ message: this.message });
  readonly editForm = new FormGroup({ message: this.editedMessage });
  private offset = 0;
  private noticeTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.destroyRef.onDestroy(() => clearTimeout(this.noticeTimer));
    this.load();
  }

  load() {
    if (this.loading() || this.posting() || this.deleting()) return;
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

  askToDelete(comment: PostComment) {
    const dialog = this.deleteDialog()?.nativeElement;
    if (!dialog || dialog.open || this.loading() || this.posting() || this.savingEdit()) return;
    this.deleteError.set('');
    clearTimeout(this.noticeTimer);
    this.notice.set('');
    this.deleteTarget.set(comment);
    dialog.showModal();
  }

  cancelDelete(event?: Event) {
    event?.preventDefault();
    if (this.deleting()) return;
    this.deleteDialog()?.nativeElement.close();
    this.deleteTarget.set(null);
  }

  confirmDelete() {
    const comment = this.deleteTarget();
    if (!comment || this.deleting()) return;
    this.deleteError.set('');
    this.deleting.set(true);
    this.posts.deleteComment(this.postId(), comment.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.comments.update(items => items.filter(item => item.id !== comment.id));
        this.offset = Math.max(0, this.offset - 1);
        this.deleting.set(false);
        this.cancelDelete();
        this.newComment()?.nativeElement.focus({ preventScroll: true });
        this.notice.set('Comentario eliminado.');
        this.noticeTimer = setTimeout(() => this.notice.set(''), 4000);
      },
      error: error => {
        this.deleting.set(false);
        this.deleteError.set(errorMessage(error));
      },
    });
  }

  private messageControl() {
    return new FormControl('', { nonNullable: true, validators: [
      Validators.required, Validators.pattern(/\S/), Validators.maxLength(this.maxLength),
    ] });
  }
}
