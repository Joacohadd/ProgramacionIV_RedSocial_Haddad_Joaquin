import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { Author, Post, User } from '../core/models';

@Component({ selector: 'app-mark', standalone: true, templateUrl: './mark.html' })
export class Mark {}

@Component({ selector: 'app-avatar', standalone: true, templateUrl: './avatar.html' })
export class Avatar { @Input({ required: true }) person!: User | Author; @Input() large = false; }

@Component({ selector: 'app-auth-visual', standalone: true, imports: [Mark, RouterLink], templateUrl: './auth-visual.html' })
export class AuthVisual {}

@Component({ selector: 'app-site-header', standalone: true, imports: [RouterLink, RouterLinkActive, Mark, Avatar], templateUrl: './site-header.html' })
export class SiteHeader {
  readonly auth = inject(AuthService); private readonly router = inject(Router);
  logout() { this.auth.clear(); void this.router.navigateByUrl('/login'); }
}

@Component({ selector: 'app-post-card', standalone: true, imports: [Avatar, DatePipe], templateUrl: './post-card.html' })
export class PostCard {
  @Input({ required: true }) post!: Post;
  @Input() index = 1;
  @Input() canDelete = false;
  @Input() busy = false;
  @Output() like = new EventEmitter<Post>();
  @Output() remove = new EventEmitter<Post>();
}
