import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';

export type AuthenticatedRequest = Request & { actor: UserDocument };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, @InjectModel(User.name) private readonly users: Model<User>) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Iniciá sesión para continuar.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; ver?: number }>(token);
      const user = await this.users.findById(payload.sub) as UserDocument | null;
      if (!user || !user.active || (payload.ver ?? 0) !== (user.tokenVersion || 0)) throw new Error('Usuario no disponible');
      req.actor = user;
      return true;
    } catch { throw new UnauthorizedException('La sesión no es válida o venció.'); }
  }
}
