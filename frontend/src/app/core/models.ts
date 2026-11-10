export interface User {
  id: string; nombre: string; apellido: string; email: string; username: string;
  fechaNacimiento: string; bio: string; avatarUrl: string | null;
  role: 'usuario' | 'administrador';
}
export interface Author { id: string; nombre: string; apellido: string; username: string; avatarUrl: string | null; }
export interface Post { id: string; title: string; description: string; imageUrl: string | null;
  createdAt: string; likesCount: number; likedByMe: boolean; author: Author; }
export interface Session { user: User; }
