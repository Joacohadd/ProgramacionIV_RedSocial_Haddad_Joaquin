import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../users/user.schema';

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true }) authorId!: Types.ObjectId;
  @Prop({ required: true, trim: true }) title!: string;
  @Prop({ required: true, trim: true }) description!: string;
  @Prop() imageUrl?: string;
  @Prop({ type: [{ type: Types.ObjectId, ref: User.name }], default: [] }) likes!: Types.ObjectId[];
  @Prop({ default: 0 }) likesCount!: number;
  @Prop({ type: Date, default: null, index: true }) deletedAt!: Date | null;
  createdAt!: Date;
}
export type PostDocument = HydratedDocument<Post>;
export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ deletedAt: 1, createdAt: -1 });
PostSchema.index({ deletedAt: 1, likesCount: -1, createdAt: -1 });
