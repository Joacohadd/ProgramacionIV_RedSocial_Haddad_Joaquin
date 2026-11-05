import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { API_URL } from '../config/api-url';
import { Session, User } from '../models';

function initialSession(): Session | null {
  try {
    const stored = localStorage.getItem('trama.session');
    return stored ? JSON.parse(stored) as Session : null;
  } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly session = signal<Session | null>(initialSession());
  readonly user = () => this.session()?.user ?? null;

  login(identifier: string, password: string) {
    return this.http.post<Session>(`${API_URL}/auth/login`, { identifier, password });
  }
  register(form: FormData) { return this.http.post<Session>(`${API_URL}/auth/register`, form); }
  requestPasswordReset(identifier: string) {
    return this.http.post<{ message: string; delivery: 'local' | 'email' }>(`${API_URL}/auth/password/forgot`, { identifier });
  }
  resetPassword(token: string, password: string, repetirPassword: string) {
    return this.http.post<{ message: string }>(`${API_URL}/auth/password/reset`, { token, password, repetirPassword });
  }
  updateProfile(form: FormData) { return this.http.patch<User>(`${API_URL}/users/me`, form); }
  save(session: Session) { localStorage.setItem('trama.session', JSON.stringify(session)); this.session.set(session); }
  updateUser(user: User) { const session = this.session(); if (session) this.save({ ...session, user }); }
  clear() { localStorage.removeItem('trama.session'); this.session.set(null); }
}
