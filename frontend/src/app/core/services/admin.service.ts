import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { API_URL } from '../config/api-url';
import type { User } from '../models';

export type AdminUser = Pick<User, 'id' | 'nombre' | 'apellido' | 'avatarUrl' | 'username' | 'email' | 'role'> & { active: boolean };
export interface StatsRange { from: string; to: string; }
export interface CountByLabel { id: string; label: string; count: number; }
export interface DailyCount { date: string; count: number; }

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  users() { return this.http.get<AdminUser[]>(`${API_URL}/users`); }

  createUser(form: FormData) { return this.http.post<AdminUser>(`${API_URL}/users`, form); }

  setActive(id: string, active: boolean) {
    const url = `${API_URL}/users/${id}`;
    return active ? this.http.post<AdminUser>(`${url}/enable`, {}) : this.http.delete<AdminUser>(url);
  }

  stats({ from, to }: StatsRange) {
    const options = { params: { from, to } };
    return forkJoin({
      posts: this.http.get<CountByLabel[]>(`${API_URL}/stats/posts-by-user`, options),
      days: this.http.get<DailyCount[]>(`${API_URL}/stats/comments-over-time`, options),
      comments: this.http.get<CountByLabel[]>(`${API_URL}/stats/comments-by-post`, options),
      logins: this.http.get<CountByLabel[]>(`${API_URL}/stats/logins-by-user`, options),
      profileVisits: this.http.get<DailyCount[]>(`${API_URL}/stats/profile-visits`, options),
      likes: this.http.get<DailyCount[]>(`${API_URL}/stats/likes-by-day`, options),
    });
  }
}
