import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import type { ImageService } from '../common/image.service';
import { User, UserDocument, publicUser } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './auth.dto';
import type { SessionClaims } from './session.guard';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>, private readonly jwt: JwtService,
    private readonly accounts: UsersService) {}

  async register(dto: RegisterDto, avatar?: Parameters<ImageService['save']>[0]) {
    return this.session(await this.accounts.createAccount(dto, 'usuario', avatar));
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.users.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+passwordHash') as UserDocument | null;
    if (!user || !await bcrypt.compare(dto.password, user.passwordHash)) throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    if (!user.active) throw new UnauthorizedException('Esta cuenta está deshabilitada.');
    return this.session(user);
  }

  private async session(user: UserDocument) {
    return { user: publicUser(user), token: await this.jwt.signAsync({ sub: user.id, role: user.role, ver: user.tokenVersion || 0 }) };
  }

  async refresh(user: UserDocument, { sub, role, ver }: SessionClaims) {
    const claims = { sub, role, ...(ver === undefined ? {} : { ver }) };
    return { user: publicUser(user), token: await this.jwt.signAsync(claims) };
  }
}
