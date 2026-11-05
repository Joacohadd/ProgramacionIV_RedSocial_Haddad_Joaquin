import { Body, Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES } from '../common/image-limits';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import { PasswordResetService } from './password-reset.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly passwords: PasswordResetService) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  register(@Body() dto: RegisterDto, @UploadedFile() avatar?: Express.Multer.File) { return this.auth.register(dto, avatar); }

  @Post('login') @HttpCode(200)
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Post('password/forgot') @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.passwords.request(dto); }

  @Post('password/reset') @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) { return this.passwords.reset(dto); }
}
