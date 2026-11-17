import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument } from '../users/user.schema';
import { CommentMessageDto, ListCommentsDto } from './comment.dto';
import { Comment, CommentDocument } from './comment.schema';
import { PostsService } from './posts.service';

const authorFields = 'nombre apellido username avatarUrl';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private readonly comments: Model<Comment>,
    private readonly posts: PostsService,
  ) {}

  async list(postId: string, { offset, limit }: ListCommentsDto) {
    const post = await this.posts.requireActive(postId);
    const comments = await this.comments.find({ postId: post._id })
      .sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit + 1)
      .populate('authorId', authorFields).exec();
    return {
      items: comments.slice(0, limit).map(comment => this.present(comment)),
      hasMore: comments.length > limit,
    };
  }

  async create(postId: string, { message }: CommentMessageDto, actor: UserDocument) {
    const post = await this.posts.requireActive(postId);
    const comment = await this.comments.create({ postId: post._id, authorId: actor._id, message });
    await comment.populate('authorId', authorFields);
    return this.present(comment);
  }

  async edit(postId: string, commentId: string, { message }: CommentMessageDto, actor: UserDocument) {
    const post = await this.posts.requireActive(postId);
    if (!Types.ObjectId.isValid(commentId)) throw new NotFoundException('Comentario no encontrado.');
    const filter = { _id: commentId, postId: post._id };
    const comment = await this.comments.findOneAndUpdate(
      { ...filter, authorId: actor._id },
      { $set: { message, modificado: true } },
      { new: true, runValidators: true },
    ).populate('authorId', authorFields).exec();

    if (comment) return this.present(comment);
    if (!await this.comments.exists(filter)) throw new NotFoundException('Comentario no encontrado.');
    throw new ForbiddenException('Solo podés editar tus propios comentarios.');
  }

  private present(comment: CommentDocument) {
    const author = comment.authorId as unknown as UserDocument | null;
    return {
      id: comment.id,
      message: comment.message,
      createdAt: comment.createdAt,
      modificado: comment.modificado,
      author: author ? {
        id: author.id, nombre: author.nombre, apellido: author.apellido,
        username: author.username, avatarUrl: author.avatarUrl || null,
      } : null,
    };
  }
}
