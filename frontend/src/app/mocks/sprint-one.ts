import { Author, Post, User } from '../core/models';

// Estos datos solo ilustran las pantallas del Sprint 1; no se guardan en MongoDB.
export const mockProfile: User = {
  id: 'ejemplo', nombre: 'Luna', apellido: 'García', email: 'luna@example.test', username: 'luna.crea',
  fechaNacimiento: '2001-05-14', bio: 'Me gustan las historias que conectan personas.',
  avatarUrl: null, role: 'usuario',
};

const author: Author = {
  id: mockProfile.id, nombre: mockProfile.nombre, apellido: mockProfile.apellido,
  username: mockProfile.username, avatarUrl: null,
};

export const mockPosts: Post[] = [
  { id: 'ejemplo-1', title: 'Las buenas ideas empiezan con una charla',
    description: 'A veces una conversación breve alcanza para mirar algo de otra manera.',
    imageUrl: null, createdAt: '2026-05-03T12:00:00.000Z', likesCount: 12, likedByMe: false, author },
  { id: 'ejemplo-2', title: 'Una pausa para mirar alrededor',
    description: 'Hoy encontré inspiración en los pequeños detalles de todos los días.',
    imageUrl: null, createdAt: '2026-05-01T12:00:00.000Z', likesCount: 8, likedByMe: false, author },
  { id: 'ejemplo-3', title: 'Compartir también es conectar',
    description: 'Una idea compartida siempre encuentra un nuevo camino.',
    imageUrl: null, createdAt: '2026-04-29T12:00:00.000Z', likesCount: 4, likedByMe: false, author },
];
