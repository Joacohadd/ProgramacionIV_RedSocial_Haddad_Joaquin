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

@Module({
  imports: [MongooseModule.forFeature([
    { name: Post.name, schema: PostSchema },
    { name: Comment.name, schema: CommentSchema },
  ]), AuthModule, UsersModule],
  controllers: [PostsController, CommentsController],
  providers: [PostsService, CommentsService, ImageService],
})
export class PostsModule {}
