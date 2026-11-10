import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ImageService } from '../common/image.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({ imports: [UsersModule], controllers: [AuthController], providers: [AuthService, ImageService] })
export class AuthModule {}
