import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';
import { UsersController } from '../users/users.controller';
import { PasswordResetMailer } from './password-reset.mailer';
import { PasswordResetService } from './password-reset.service';
import { AdminGuard } from './admin.guard';

@Module({ imports: [UsersModule, JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '3m' } })],
  controllers: [AuthController, UsersController], providers: [AuthService, SessionGuard, AdminGuard, PasswordResetMailer, PasswordResetService], exports: [SessionGuard, AdminGuard, JwtModule] })
export class AuthModule {}
