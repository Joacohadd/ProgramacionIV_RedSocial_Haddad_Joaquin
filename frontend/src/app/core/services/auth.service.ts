import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { API_URL } from '../config/api-url';
import { PublicProfile, Session, User } from '../models';

function initialSession(): Session | null {
  try {
    const stored = localStorage.getItem('trama.session');
    if (!stored) return null;
    const session: Session | null = JSON.parse(stored);
    return session?.user?.id && typeof session.token === 'string' ? session : null;
  } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly session = signal<Session | null>(initialSession());
  private readonly validatedToken = signal<string | null>(null);
  readonly authorized = computed(() => {
    const token = this.session()?.token;
    return !!token && token === this.validatedToken();
  });
  readonly user = () => this.session()?.user ?? null;

  login(identifier: string, password: string) {
    return this.http.post<Session>(`${API_URL}/auth/login`, { identifier, password });
  }
  register(form: FormData) { return this.http.post<Session>(`${API_URL}/auth/register`, form); }
  authorize() { return this.http.post<User>(`${API_URL}/auth/authorize`, {}); }
  refresh() { return this.http.post<Session>(`${API_URL}/auth/refresh`, {}); }
  requestPasswordReset(identifier: string) {
    return this.http.post<{ message: string; delivery: 'local' | 'email' }>(`${API_URL}/auth/password/forgot`, { identifier });
  }
  resetPassword(token: string, password: string, repetirPassword: string) {
    return this.http.post<{ message: string }>(`${API_URL}/auth/password/reset`, { token, password, repetirPassword });
  }
  profile(id: string) { return this.http.get<PublicProfile>(`${API_URL}/users/${id}/profile`); }
  updateProfile(form: FormData) { return this.http.patch<User>(`${API_URL}/users/me`, form); }
  save(session: Session) {
    localStorage.setItem('trama.session', JSON.stringify(session));
    this.session.set(session);
    this.validatedToken.set(session.token);
  }
  updateUser(user: User) { const session = this.session(); if (session) this.save({ ...session, user }); }
  clear() {
    localStorage.removeItem('trama.session');
    this.session.set(null);
    this.validatedToken.set(null);
  }
}
