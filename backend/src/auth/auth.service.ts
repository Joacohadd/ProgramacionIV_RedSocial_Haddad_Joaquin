import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ImageService } from '../common/image.service';
import { User, UserDocument, publicUser } from '../users/user.schema';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>, private readonly images: ImageService) {}

  async register(dto: RegisterDto, avatar?: Express.Multer.File) {
    if (dto.password !== dto.repetirPassword) throw new BadRequestException('Las contraseñas no coinciden.');
    if (new Date(dto.fechaNacimiento) > new Date()) throw new BadRequestException('La fecha de nacimiento no puede ser futura.');
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    if (await this.users.exists({ $or: [{ email }, { username }] })) throw new ConflictException('El correo o nombre de usuario ya está registrado.');
    const avatarUrl = await this.images.save(avatar);
    try {
      const user = await this.users.create({ nombre: dto.nombre.trim(), apellido: dto.apellido.trim(),
        email, username, passwordHash: await bcrypt.hash(dto.password, 12),
        fechaNacimiento: dto.fechaNacimiento, bio: dto.bio.trim(), avatarUrl, role: 'usuario' });
      return this.session(user);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new ConflictException('El correo o nombre de usuario ya está registrado.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.users.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+passwordHash') as UserDocument | null;
    if (!user || !await bcrypt.compare(dto.password, user.passwordHash)) throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    return this.session(user);
  }

  private session(user: UserDocument) { return { user: publicUser(user) }; }
}
