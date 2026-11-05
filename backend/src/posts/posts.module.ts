import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ImageService } from '../common/image.service';
import { UsersModule } from '../users/users.module';
import { Post, PostSchema } from './post.schema';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({ imports: [MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]), AuthModule, UsersModule],
  controllers: [PostsController], providers: [PostsService, ImageService] })
export class PostsModule {}
