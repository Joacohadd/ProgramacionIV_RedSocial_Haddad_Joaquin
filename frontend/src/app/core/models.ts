export interface User {
  id: string; nombre: string; apellido: string; email: string; username: string;
  fechaNacimiento: string; bio: string; avatarUrl: string | null;
  role: 'usuario' | 'administrador';
}
export interface Author { id: string; nombre: string; apellido: string; username: string; avatarUrl: string | null; }
export interface PublicProfile extends Author { bio: string; }
export interface Post { id: string; title: string; description: string; imageUrl: string | null;
  createdAt: string; likesCount: number; likedByMe: boolean; author: Author; }
export interface PostPage { items: Post[]; total: number; offset: number; limit: number; }
export interface FeedPageResult { items: Post[]; nextCursor: string | null; }
export interface PostComment {
  id: string;
  message: string;
  createdAt: string;
  modificado: boolean;
  author: Author | null;
}
export interface CommentPage { items: PostComment[]; hasMore: boolean; }
export interface Session { user: User; token: string; }
