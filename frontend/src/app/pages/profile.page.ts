import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mockPosts, mockProfile } from '../mocks/sprint-one';
import { Avatar, PostCard, SiteHeader } from '../shared/ui';

@Component({ standalone: true, imports: [DatePipe, RouterLink, SiteHeader, Avatar, PostCard], templateUrl: './profile.page.html' })
export class ProfilePage {
  readonly user = mockProfile;
  readonly examples = mockPosts;
}
