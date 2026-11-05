import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageService } from '../common/image.service';
import { User, UserSchema } from './user.schema';
import { UsersService } from './users.service';

@Module({ imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [UsersService, ImageService], exports: [MongooseModule, UsersService] })
export class UsersModule {}
