import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { API_URL } from '../config/api-url';
import { Session } from '../models';

function initialSession(): Session | null {
  try {
    const stored = localStorage.getItem('trama.sprint1.session');
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
  save(session: Session) { localStorage.setItem('trama.sprint1.session', JSON.stringify(session)); this.session.set(session); }
  clear() { localStorage.removeItem('trama.sprint1.session'); this.session.set(null); }
}
