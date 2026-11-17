import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { CommentMessageDto, ListCommentsDto } from './comment.dto';
import { CommentsService } from './comments.service';

@Controller('posts/:postId/comments')
@UseGuards(SessionGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Param('postId') postId: string, @Query() query: ListCommentsDto) {
    return this.comments.list(postId, query);
  }

  @Post()
  create(@Param('postId') postId: string, @Body() dto: CommentMessageDto, @Req() req: AuthenticatedRequest) {
    return this.comments.create(postId, dto, req.actor);
  }

  @Put(':commentId')
  edit(@Param('postId') postId: string, @Param('commentId') commentId: string,
       @Body() dto: CommentMessageDto, @Req() req: AuthenticatedRequest) {
    return this.comments.edit(postId, commentId, dto, req.actor);
  }
}
