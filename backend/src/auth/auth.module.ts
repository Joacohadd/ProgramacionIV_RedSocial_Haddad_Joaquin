import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { ImageService } from '../common/image.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';
import { UsersController } from '../users/users.controller';
import { PasswordResetMailer } from './password-reset.mailer';
import { PasswordResetService } from './password-reset.service';

@Module({ imports: [UsersModule, JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '15m' } })],
  controllers: [AuthController, UsersController], providers: [AuthService, ImageService, SessionGuard, PasswordResetMailer, PasswordResetService], exports: [SessionGuard, JwtModule] })
export class AuthModule {}
