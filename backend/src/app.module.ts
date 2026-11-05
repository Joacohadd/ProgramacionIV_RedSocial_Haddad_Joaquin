import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';

@Module({ imports: [MongooseModule.forRoot(process.env.MONGODB_URI || '', { dbName: process.env.MONGODB_DB || 'trama_tp2' }), UsersModule, AuthModule, PostsModule] })
export class AppModule {}
