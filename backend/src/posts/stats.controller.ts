import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
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

  @Get('logins-by-user')
  loginsByUser(@Query() range: StatsRangeDto) {
    return this.stats.loginsByUser(range);
  }

  @Get('profile-visits')
  profileVisits(@Query() range: StatsRangeDto, @Req() req: AuthenticatedRequest) {
    return this.stats.profileVisits(range, req.actor._id);
  }

  @Get('likes-by-day')
  likesByDay(@Query() range: StatsRangeDto) {
    return this.stats.likesByDay(range);
  }
}
