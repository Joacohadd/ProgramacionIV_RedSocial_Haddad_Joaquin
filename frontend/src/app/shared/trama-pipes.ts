import { Pipe, PipeTransform } from '@angular/core';
import type { User } from '../core/models';

@Pipe({ name: 'nombreCompleto' })
export class FullNamePipe implements PipeTransform {
  transform(person: Pick<User, 'nombre' | 'apellido'>) {
    return [person.nombre, person.apellido].filter(Boolean).join(' ');
  }
}

@Pipe({ name: 'rolCuenta' })
export class RoleLabelPipe implements PipeTransform {
  transform(role: User['role']) {
    return role === 'administrador' ? 'Administrador' : 'Usuario';
  }
}

@Pipe({ name: 'resumen' })
export class ExcerptPipe implements PipeTransform {
  transform(text: string, limit = 45) {
    const characters = Array.from(text);
    return characters.length > limit ? characters.slice(0, limit - 1).join('') + '…' : text;
  }
}
