import { Body, Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES } from '../common/image-limits';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  register(@Body() dto: RegisterDto, @UploadedFile() avatar?: Express.Multer.File) { return this.auth.register(dto, avatar); }

  @Post('login') @HttpCode(200)
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }
}
