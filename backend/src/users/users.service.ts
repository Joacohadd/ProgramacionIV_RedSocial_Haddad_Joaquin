import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import type { RegisterDto } from '../auth/auth.dto';
import { ImageService } from '../common/image.service';
import { User, UserDocument, publicUser } from './user.schema';
import { UpdateProfileDto } from './update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>, private readonly images: ImageService) {}

  async createAccount(dto: RegisterDto, role: User['role'], avatar?: Parameters<ImageService['save']>[0]) {
    if (dto.password !== dto.repetirPassword) throw new BadRequestException('Las contraseñas no coinciden.');
    if (new Date(dto.fechaNacimiento) > new Date()) throw new BadRequestException('La fecha de nacimiento no puede ser futura.');
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    if (await this.users.exists({ $or: [{ email }, { username }] })) {
      throw new ConflictException('El correo o nombre de usuario ya está registrado.');
    }
    const avatarUrl = await this.images.save(avatar);
    try {
      return await this.users.create({
        nombre: dto.nombre.trim(), apellido: dto.apellido.trim(), email, username,
        passwordHash: await bcrypt.hash(dto.password, 12),
        fechaNacimiento: dto.fechaNacimiento, bio: dto.bio.trim(), avatarUrl, role,
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        throw new ConflictException('El correo o nombre de usuario ya está registrado.');
      }
      throw error;
    }
  }

  async listForAdmin() {
    const users = await this.users.find().select('nombre apellido username email role active avatarUrl')
      .sort({ apellido: 1, nombre: 1, _id: 1 }).exec();
    return users.map(adminUser);
  }

  async profile(id: string, actor: UserDocument) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Perfil no encontrado.');
    const filter = { _id: new Types.ObjectId(id), active: { $ne: false } };
    const day = new Date().toISOString().slice(0, 10);
    const query = actor.id === filter._id.toString()
      ? this.users.findOne(filter)
      : this.users.findOneAndUpdate(filter, { $inc: { [`profileViewsByDay.${day}`]: 1 } }, { new: true });
    const user = await query.select('nombre apellido username avatarUrl bio').exec();
    if (!user) throw new NotFoundException('Perfil no encontrado.');
    return {
      id: user.id, nombre: user.nombre, apellido: user.apellido, username: user.username,
      avatarUrl: user.avatarUrl || null, bio: user.bio,
    };
  }

  async setActive(id: string, active: boolean, actor: UserDocument) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Usuario no encontrado.');
    if (!active && id.toLowerCase() === actor.id) {
      throw new BadRequestException('No podés deshabilitar tu propia cuenta desde el panel.');
    }
    const user = await this.users.findByIdAndUpdate(id, {
      $set: { active },
      ...(!active ? { $inc: { tokenVersion: 1 } } : {}),
    }, { new: true }).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return adminUser(user);
  }

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

export function adminUser(user: UserDocument) {
  return {
    id: user.id, nombre: user.nombre, apellido: user.apellido, username: user.username,
    email: user.email, role: user.role, active: user.active !== false, avatarUrl: user.avatarUrl || null,
  };
}
