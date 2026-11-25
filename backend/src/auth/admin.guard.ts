import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './session.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { actor } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (actor?.role !== 'administrador') {
      throw new ForbiddenException('Esta sección está reservada para administradores.');
    }
    return true;
  }
}
