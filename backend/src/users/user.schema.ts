import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true }) nombre!: string;
  @Prop({ required: true, trim: true }) apellido!: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) email!: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) username!: string;
  @Prop({ required: true, select: false }) passwordHash!: string;
  @Prop({ required: true }) fechaNacimiento!: string;
  @Prop({ required: true, trim: true }) bio!: string;
  @Prop() avatarUrl?: string;
  @Prop({ type: String, enum: ['usuario', 'administrador'], default: 'usuario' }) role!: 'usuario' | 'administrador';
}
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

export function publicUser(user: UserDocument) {
  return { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email,
    username: user.username, fechaNacimiento: user.fechaNacimiento, bio: user.bio,
    avatarUrl: user.avatarUrl || null, role: user.role };
}
