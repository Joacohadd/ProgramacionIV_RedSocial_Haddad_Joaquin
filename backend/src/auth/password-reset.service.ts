import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.schema';
import { ForgotPasswordDto, ResetPasswordDto } from './auth.dto';
import { PasswordResetMailer } from './password-reset.mailer';

const genericResponse = 'Si existe una cuenta activa, habrá un enlace para cambiar tu contraseña.';

@Injectable()
export class PasswordResetService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>, private readonly mailer: PasswordResetMailer) {}

  async request(dto: ForgotPasswordDto) {
    this.mailer.assertReady();
    const identifier = dto.identifier.trim().toLowerCase();
    const token = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const user = await this.users.findOneAndUpdate(
      { $or: [{ email: identifier }, { username: identifier }], active: true,
        $and: [{ $or: [{ passwordResetRequestedAt: { $exists: false } },
          { passwordResetRequestedAt: { $lte: new Date(now.getTime() - 60_000) } }] }] },
      { $set: { passwordResetTokenHash: hash, passwordResetExpiresAt: new Date(now.getTime() + 30 * 60_000),
        passwordResetRequestedAt: now } }, { new: true },
    ).exec();
    if (user) {
      try {
        await this.mailer.send(user.email, token);
      } catch {
        await this.users.updateOne({ _id: user._id, passwordResetTokenHash: hash },
          { $unset: { passwordResetTokenHash: '', passwordResetExpiresAt: '', passwordResetRequestedAt: '' } }).exec();
        throw new ServiceUnavailableException('No se pudo enviar el enlace. Intentá de nuevo más tarde.');
      }
    }
    return { message: genericResponse, delivery: this.mailer.deliveryMode() };
  }

  async reset(dto: ResetPasswordDto) {
    if (dto.password !== dto.repetirPassword) throw new BadRequestException('Las contraseñas no coinciden.');
    const hash = createHash('sha256').update(dto.token).digest('hex');
    const filter = { passwordResetTokenHash: hash, passwordResetExpiresAt: { $gt: new Date() }, active: true };
    const user = await this.users.findOne(filter).exec();
    if (!user) throw new BadRequestException('El enlace no es válido o venció. Solicitá uno nuevo.');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const updated = await this.users.findOneAndUpdate(
      { _id: user._id, passwordResetTokenHash: hash, passwordResetExpiresAt: { $gt: new Date() }, active: true },
      { $set: { passwordHash }, $unset: { passwordResetTokenHash: '', passwordResetExpiresAt: '', passwordResetRequestedAt: '' },
        $inc: { tokenVersion: 1 } }, { new: true },
    ).exec();
    if (!updated) throw new BadRequestException('El enlace no es válido o venció. Solicitá uno nuevo.');
    return { message: 'Contraseña actualizada. Ya podés iniciar sesión.' };
  }
}
