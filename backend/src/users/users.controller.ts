import { Body, Controller, Patch, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES } from '../common/image-limits';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { UpdateProfileDto } from './update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(SessionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File) {
    return this.users.updateProfile(req.actor, dto, avatar);
  }
}
