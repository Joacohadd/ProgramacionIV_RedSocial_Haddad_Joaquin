import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { MAX_IMAGE_BYTES } from '../common/image-limits';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { UpdateProfileDto } from './update-profile.dto';
import { adminUser, UsersService } from './users.service';
import { CreateAdminUserDto } from './create-admin-user.dto';

@Controller('users')
@UseGuards(SessionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(AdminGuard)
  list() {
    return this.users.listForAdmin();
  }

  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  async create(@Body() dto: CreateAdminUserDto, @UploadedFile() avatar?: Express.Multer.File) {
    return adminUser(await this.users.createAccount(dto, dto.role, avatar));
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  disable(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.users.setActive(id, false, req.actor);
  }

  @Post(':id/enable')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  enable(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.users.setActive(id, true, req.actor);
  }

  @Patch('me')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File) {
    return this.users.updateProfile(req.actor, dto, avatar);
  }
}
