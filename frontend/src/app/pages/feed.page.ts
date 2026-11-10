import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mockPosts } from '../mocks/sprint-one';
import { PostCard, SiteHeader } from '../shared/ui';

@Component({ standalone: true, imports: [RouterLink, SiteHeader, PostCard], templateUrl: './feed.page.html' })
export class FeedPage {
  readonly examples = mockPosts;
}
