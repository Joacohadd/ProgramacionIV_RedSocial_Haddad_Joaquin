import { Body, Controller, Delete, Get, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES } from '../common/image-limits';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { CreatePostDto, ListPostsDto } from './post.dto';
import { PostsService } from './posts.service';

@Controller('posts') @UseGuards(SessionGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get() list(@Query() query: ListPostsDto, @Req() req: AuthenticatedRequest) { return this.posts.list(query, req.actor); }

  @Post() @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  create(@Body() dto: CreatePostDto, @UploadedFile() image: Express.Multer.File | undefined, @Req() req: AuthenticatedRequest) {
    return this.posts.create(dto, image, req.actor);
  }

  @Delete(':id') remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.posts.remove(id, req.actor); }
  @Post(':id/likes') like(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.posts.like(id, req.actor); }
  @Delete(':id/likes') unlike(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.posts.unlike(id, req.actor); }
}
