import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { MAX_IMAGE_BYTES } from '../common/image-limits';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { UpdateProfileDto } from './update-profile.dto';
import { adminUser, UsersService } from './users.service';
import { CreateAdminUserDto } from './create-admin-user.dto';

type AvatarFile = Parameters<UsersService['createAccount']>[2];

@Controller('users')
@UseGuards(SessionGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(AdminGuard)
  list() {
    return this.users.listForAdmin();
  }

  @Get(':id/profile')
  @Header('Cache-Control', 'private, no-store')
  profile(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.users.profile(id, req.actor);
  }

  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  async create(@Body() dto: CreateAdminUserDto, @UploadedFile() avatar?: AvatarFile) {
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
    @UploadedFile() avatar?: AvatarFile) {
    return this.users.updateProfile(req.actor, dto, avatar);
  }
}
