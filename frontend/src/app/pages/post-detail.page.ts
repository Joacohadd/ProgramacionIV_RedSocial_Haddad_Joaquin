import { Component, DestroyRef, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, combineLatest, startWith, switchMap } from 'rxjs';
import { Post } from '../core/models';
import { AuthService } from '../core/services/auth.service';
import { PostsService } from '../core/services/posts.service';
import { errorMessage } from '../core/services/http-error';
import { PostComments } from '../shared/post-comments';
import { PostCard, SiteHeader } from '../shared/ui';

@Component({
  standalone: true,
  imports: [RouterLink, PostCard, PostComments, SiteHeader],
  templateUrl: './post-detail.page.html',
})
export class PostDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly posts = inject(PostsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retry = new Subject<void>();
  private readonly deleteDialog = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDialog');
  readonly auth = inject(AuthService);
  readonly item = signal<Post | null>(null);
  readonly error = signal('');
  readonly likeError = signal('');
  readonly liking = signal(false);
  readonly notFound = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');

  ngOnInit() {
    combineLatest([this.route.paramMap, this.retry.pipe(startWith(undefined))]).pipe(
      switchMap(([params]) => {
        this.item.set(null);
        this.error.set('');
        this.likeError.set('');
        this.liking.set(false);
        this.notFound.set(false);
        return this.posts.detail(params.get('id')!).pipe(catchError(error => {
          this.error.set(errorMessage(error));
          this.notFound.set(error.status === 404);
          return EMPTY;
        }));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(post => this.item.set(post));
  }

  reload() { this.retry.next(); }

  askToDelete() {
    this.deleteError.set('');
    this.deleteDialog().nativeElement.showModal();
  }

  cancelDelete(event?: Event) {
    event?.preventDefault();
    if (!this.deleting()) this.deleteDialog().nativeElement.close();
  }

  confirmDelete() {
    const post = this.item();
    if (!post || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.posts.remove(post.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.deleting.set(false);
        this.cancelDelete();
        void this.router.navigateByUrl('/publicaciones');
      },
      error: error => {
        this.deleteError.set(errorMessage(error));
        this.deleting.set(false);
      },
    });
  }

  toggleLike(post: Post) {
    if (this.liking()) return;
    this.liking.set(true);
    this.likeError.set('');
    const request = post.likedByMe ? this.posts.unlike(post.id) : this.posts.like(post.id);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        if (this.item()?.id !== post.id) return;
        this.item.set(updated);
        this.liking.set(false);
      },
      error: error => {
        if (this.item()?.id !== post.id) return;
        this.likeError.set(errorMessage(error));
        this.liking.set(false);
      },
    });
  }
}
