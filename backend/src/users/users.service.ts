import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ImageService } from '../common/image.service';
import { User, UserDocument, publicUser } from './user.schema';
import { UpdateProfileDto } from './update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>, private readonly images: ImageService) {}

  async updateProfile(actor: UserDocument, dto: UpdateProfileDto, avatar?: Express.Multer.File) {
    const hasDetails = dto.nombre !== undefined || dto.apellido !== undefined || dto.email !== undefined ||
      dto.username !== undefined || dto.fechaNacimiento !== undefined || dto.bio !== undefined;
    if (!hasDetails && !avatar) throw new BadRequestException('No hay cambios para guardar.');
    if (dto.fechaNacimiento && new Date(dto.fechaNacimiento) > new Date()) {
      throw new BadRequestException('La fecha de nacimiento no puede ser futura.');
    }

    const email = dto.email?.trim().toLowerCase();
    const username = dto.username?.trim().toLowerCase();
    const duplicates: Array<Record<string, string>> = [];
    if (email && email !== actor.email) duplicates.push({ email });
    if (username && username !== actor.username) duplicates.push({ username });
    if (duplicates.length && await this.users.exists({ _id: { $ne: actor._id }, $or: duplicates })) {
      throw new ConflictException('El correo o nombre de usuario ya está registrado.');
    }

    const avatarUrl = await this.images.save(avatar);
    if (dto.nombre !== undefined) actor.nombre = dto.nombre.trim();
    if (dto.apellido !== undefined) actor.apellido = dto.apellido.trim();
    if (email !== undefined) actor.email = email;
    if (username !== undefined) actor.username = username;
    if (dto.fechaNacimiento !== undefined) actor.fechaNacimiento = dto.fechaNacimiento;
    if (dto.bio !== undefined) actor.bio = dto.bio.trim();
    if (avatarUrl) actor.avatarUrl = avatarUrl;
    try {
      await actor.save();
      return publicUser(actor);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new ConflictException('El correo o nombre de usuario ya está registrado.');
      }
      throw error;
    }
  }
}
