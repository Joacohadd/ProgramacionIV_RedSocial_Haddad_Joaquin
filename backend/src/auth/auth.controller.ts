import { Body, Controller, HttpCode, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES } from '../common/image-limits';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import { PasswordResetService } from './password-reset.service';
import { AuthenticatedRequest, SessionGuard } from './session.guard';
import { publicUser } from '../users/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly passwords: PasswordResetService) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  register(@Body() dto: RegisterDto, @UploadedFile() avatar?: Express.Multer.File) { return this.auth.register(dto, avatar); }

  @Post('login') @HttpCode(200)
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Post('authorize')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  authorize(@Req() req: AuthenticatedRequest) {
    return publicUser(req.actor);
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  refresh(@Req() req: AuthenticatedRequest) {
    return this.auth.refresh(req.actor, req.sessionClaims);
  }

  @Post('password/forgot') @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.passwords.request(dto); }

  @Post('password/reset') @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) { return this.passwords.reset(dto); }
}
