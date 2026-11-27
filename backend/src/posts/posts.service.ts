import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ImageService } from '../common/image.service';
import { UserDocument } from '../users/user.schema';
import { CreatePostDto, FeedPostsDto, ListPostsDto } from './post.dto';
import { Post, PostDocument } from './post.schema';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private readonly posts: Model<Post>, private readonly images: ImageService) {}

  async list(query: ListPostsDto, actor: UserDocument) {
    const filter = { deletedAt: null, ...(query.userId ? { authorId: new Types.ObjectId(query.userId) } : {}) };
    const [items, total] = await Promise.all([
      this.posts.find(filter).sort(this.order(query.sort)).skip(query.offset).limit(query.limit)
        .populate('authorId', 'nombre apellido username avatarUrl').exec(),
      this.posts.countDocuments(filter),
    ]);
    return { items: items.map(post => this.present(post, actor)), total, offset: query.offset, limit: query.limit };
  }

  async feed({ sort, limit, after }: FeedPostsDto, actor: UserDocument) {
    const filter = { deletedAt: null, ...(after ? this.afterCursor(after, sort) : {}) };
    const page = await this.posts.find(filter).sort(this.order(sort)).limit(limit + 1)
      .populate('authorId', 'nombre apellido username avatarUrl').exec();
    const items = page.slice(0, limit);
    const last = items.at(-1);
    return {
      items: items.map(post => this.present(post, actor)),
      nextCursor: last && page.length > limit ? `${last.createdAt.toISOString()}~${last.id}~${last.likesCount ?? 0}` : null,
    };
  }

  private order(sort: FeedPostsDto['sort']): Record<string, 1 | -1> {
    return sort === 'likes' ? { likesCount: -1, createdAt: -1, _id: -1 } : { createdAt: -1, _id: -1 };
  }

  private afterCursor(cursor: string, sort: FeedPostsDto['sort']) {
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)~([a-f0-9]{24})~(\d+)$/i.exec(cursor);
    if (!match) throw new BadRequestException('La referencia del feed no es válida.');
    const [, date, id, count] = match;
    const createdAt = new Date(date);
    const likesCount = Number(count);
    if (!Number.isFinite(createdAt.getTime()) || !Number.isSafeInteger(likesCount)) {
      throw new BadRequestException('La referencia del feed no es válida.');
    }
    const older = [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: new Types.ObjectId(id) } }];
    return sort === 'date' ? { $or: older } : {
      $or: [{ likesCount: { $lt: likesCount } }, { likesCount, $or: older }],
    };
  }

  async create(dto: CreatePostDto, file: Express.Multer.File | undefined, actor: UserDocument) {
    const imageUrl = await this.images.save(file);
    const post = await this.posts.create({ authorId: actor._id, title: dto.title.trim(),
      description: dto.description.trim(), imageUrl });
    await post.populate('authorId', 'nombre apellido username avatarUrl');
    return this.present(post, actor);
  }

  async detail(id: string, actor: UserDocument) {
    const post = await this.requireActive(id);
    await post.populate('authorId', 'nombre apellido username avatarUrl');
    return this.present(post, actor);
  }

  async remove(id: string, actor: UserDocument) {
    const post = await this.requireActive(id);
    if (String(post.authorId) !== actor.id && actor.role !== 'administrador') throw new ForbiddenException('Solo podés eliminar tus publicaciones.');
    post.deletedAt = new Date();
    await post.save();
    return { deleted: true };
  }

  async like(id: string, actor: UserDocument) {
    const day = new Date().toISOString().slice(0, 10);
    const post = await this.posts.findOneAndUpdate(
      { _id: this.objectId(id), deletedAt: null, likes: { $ne: actor._id } },
      { $addToSet: { likes: actor._id }, $inc: { likesCount: 1, [`likesByDay.${day}`]: 1 } }, { new: true },
    ).populate('authorId', 'nombre apellido username avatarUrl').exec();
    if (!post) { await this.requireActive(id); throw new ConflictException('Ya diste Me gusta a esta publicación.'); }
    return this.present(post, actor);
  }

  async unlike(id: string, actor: UserDocument) {
    const post = await this.posts.findOneAndUpdate(
      { _id: this.objectId(id), deletedAt: null, likes: actor._id },
      { $pull: { likes: actor._id }, $inc: { likesCount: -1 } }, { new: true },
    ).populate('authorId', 'nombre apellido username avatarUrl').exec();
    if (!post) { await this.requireActive(id); throw new ConflictException('Todavía no diste Me gusta a esta publicación.'); }
    return this.present(post, actor);
  }

  private objectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Publicación no encontrada.');
    return new Types.ObjectId(id);
  }

  async requireActive(id: string) {
    const post = await this.posts.findOne({ _id: this.objectId(id), deletedAt: null });
    if (!post) throw new NotFoundException('Publicación no encontrada.');
    return post;
  }

  private present(post: PostDocument, actor: UserDocument) {
    const author = post.authorId as unknown as UserDocument;
    return { id: post.id, title: post.title, description: post.description, imageUrl: post.imageUrl || null,
      createdAt: post.createdAt, likesCount: post.likesCount, likedByMe: post.likes.some(id => String(id) === actor.id),
      author: { id: author.id, nombre: author.nombre, apellido: author.apellido,
        username: author.username, avatarUrl: author.avatarUrl || null } };
  }
}
