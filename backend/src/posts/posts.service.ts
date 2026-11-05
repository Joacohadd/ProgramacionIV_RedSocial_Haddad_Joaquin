import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ImageService } from '../common/image.service';
import { UserDocument } from '../users/user.schema';
import { CreatePostDto, ListPostsDto } from './post.dto';
import { Post, PostDocument } from './post.schema';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private readonly posts: Model<Post>, private readonly images: ImageService) {}

  async list(query: ListPostsDto, actor: UserDocument) {
    const filter = { deletedAt: null, ...(query.userId ? { authorId: new Types.ObjectId(query.userId) } : {}) };
    const sort: Record<string, 1 | -1> = query.sort === 'likes' ? { likesCount: -1, createdAt: -1 } : { createdAt: -1 };
    const [items, total] = await Promise.all([
      this.posts.find(filter).sort(sort).skip(query.offset).limit(query.limit)
        .populate('authorId', 'nombre apellido username avatarUrl').exec(),
      this.posts.countDocuments(filter),
    ]);
    return { items: items.map(post => this.present(post, actor)), total, offset: query.offset, limit: query.limit };
  }

  async create(dto: CreatePostDto, file: Express.Multer.File | undefined, actor: UserDocument) {
    const imageUrl = await this.images.save(file);
    const post = await this.posts.create({ authorId: actor._id, title: dto.title.trim(),
      description: dto.description.trim(), imageUrl });
    await post.populate('authorId', 'nombre apellido username avatarUrl');
    return this.present(post, actor);
  }

  async remove(id: string, actor: UserDocument) {
    const post = await this.existing(id);
    if (String(post.authorId) !== actor.id && actor.role !== 'administrador') throw new ForbiddenException('Solo podés eliminar tus publicaciones.');
    post.deletedAt = new Date();
    await post.save();
    return { deleted: true };
  }

  async like(id: string, actor: UserDocument) {
    const post = await this.posts.findOneAndUpdate(
      { _id: this.objectId(id), deletedAt: null, likes: { $ne: actor._id } },
      { $addToSet: { likes: actor._id }, $inc: { likesCount: 1 } }, { new: true },
    ).populate('authorId', 'nombre apellido username avatarUrl').exec();
    if (!post) { await this.existing(id); throw new ConflictException('Ya diste Me gusta a esta publicación.'); }
    return this.present(post, actor);
  }

  async unlike(id: string, actor: UserDocument) {
    const post = await this.posts.findOneAndUpdate(
      { _id: this.objectId(id), deletedAt: null, likes: actor._id },
      { $pull: { likes: actor._id }, $inc: { likesCount: -1 } }, { new: true },
    ).populate('authorId', 'nombre apellido username avatarUrl').exec();
    if (!post) { await this.existing(id); throw new ConflictException('Todavía no diste Me gusta a esta publicación.'); }
    return this.present(post, actor);
  }

  private objectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Publicación no encontrada.');
    return new Types.ObjectId(id);
  }

  private async existing(id: string) {
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
