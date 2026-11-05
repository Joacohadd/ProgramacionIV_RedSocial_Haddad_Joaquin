import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '../config/api-url';
import { Post, PostPage } from '../models';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);
  list(params: { sort: 'date' | 'likes'; offset: number; limit: number; userId?: string }) {
    return this.http.get<PostPage>(`${API_URL}/posts`, { params: { sort: params.sort, offset: params.offset,
      limit: params.limit, ...(params.userId ? { userId: params.userId } : {}) } });
  }
  create(form: FormData) { return this.http.post<Post>(`${API_URL}/posts`, form); }
  like(id: string) { return this.http.post<Post>(`${API_URL}/posts/${id}/likes`, {}); }
  unlike(id: string) { return this.http.delete<Post>(`${API_URL}/posts/${id}/likes`); }
  remove(id: string) { return this.http.delete<{ deleted: boolean }>(`${API_URL}/posts/${id}`); }
}
