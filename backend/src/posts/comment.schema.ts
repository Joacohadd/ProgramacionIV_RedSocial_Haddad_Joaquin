import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../users/user.schema';
import { Post } from './post.schema';

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: Post.name, required: true })
  postId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  authorId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  message!: string;

  @Prop({ default: false })
  modificado!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  createdAt!: Date;
}

export type CommentDocument = HydratedDocument<Comment>;
export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ postId: 1, createdAt: -1, _id: -1 });
CommentSchema.index({ deletedAt: 1, createdAt: -1 });
