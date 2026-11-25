import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionGuard } from '../auth/session.guard';
import { StatsRangeDto, StatsService } from './stats.service';

@Controller('stats')
@UseGuards(SessionGuard, AdminGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('posts-by-user')
  postsByUser(@Query() range: StatsRangeDto) {
    return this.stats.postsByUser(range);
  }

  @Get('comments-over-time')
  commentsOverTime(@Query() range: StatsRangeDto) {
    return this.stats.commentsOverTime(range);
  }

  @Get('comments-by-post')
  commentsByPost(@Query() range: StatsRangeDto) {
    return this.stats.commentsByPost(range);
  }
}
