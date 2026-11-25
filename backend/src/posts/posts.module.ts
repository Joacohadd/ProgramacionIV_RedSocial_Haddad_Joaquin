import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ImageService } from '../common/image.service';
import { UsersModule } from '../users/users.module';
import { Comment, CommentSchema } from './comment.schema';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Post, PostSchema } from './post.schema';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Post.name, schema: PostSchema },
    { name: Comment.name, schema: CommentSchema },
  ]), AuthModule, UsersModule],
  controllers: [PostsController, CommentsController, StatsController],
  providers: [PostsService, CommentsService, StatsService, ImageService],
})
export class PostsModule {}
