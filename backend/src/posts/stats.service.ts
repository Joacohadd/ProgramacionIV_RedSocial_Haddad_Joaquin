import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { IsDateString, Matches } from 'class-validator';
import { Model, PipelineStage } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { Comment } from './comment.schema';
import { Post } from './post.schema';

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const dayInMilliseconds = 86_400_000;

export class StatsRangeDto {
  @Matches(dateOnly) @IsDateString({ strict: true }) from!: string;
  @Matches(dateOnly) @IsDateString({ strict: true }) to!: string;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Post.name) private readonly posts: Model<Post>,
    @InjectModel(Comment.name) private readonly comments: Model<Comment>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  postsByUser(range: StatsRangeDto) {
    return this.posts.aggregate<{ id: string; label: string; count: number }>([
      { $match: this.byDate(range) },
      { $group: { _id: '$authorId', count: { $sum: 1 } } },
      { $lookup: {
        from: this.users.collection.name, localField: '_id', foreignField: '_id',
        pipeline: [{ $project: { username: 1 } }], as: 'author',
      } },
      { $sort: { count: -1, _id: 1 } },
      { $project: {
        _id: 0, id: { $toString: '$_id' },
        label: { $ifNull: [{ $arrayElemAt: ['$author.username', 0] }, 'Cuenta no disponible'] },
        count: 1,
      } },
    ]).exec();
  }

  commentsOverTime(range: StatsRangeDto) {
    return this.comments.aggregate<{ date: string; count: number }>([
      ...this.activeComments(range),
      { $group: {
        _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: 'UTC' } },
        count: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ]).exec();
  }

  commentsByPost(range: StatsRangeDto) {
    return this.comments.aggregate<{ id: string; label: string; count: number }>([
      ...this.activeComments(range),
      { $group: { _id: '$postId', label: { $first: '$post.title' }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, id: { $toString: '$_id' }, label: 1, count: 1 } },
    ]).exec();
  }

  loginsByUser(range: StatsRangeDto) {
    return this.users.aggregate<{ id: string; label: string; count: number }>([
      ...this.dailyEntries(range, 'loginsByDay'),
      { $group: { _id: '$_id', label: { $first: '$username' }, count: { $sum: '$entries.v' } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, id: { $toString: '$_id' }, label: 1, count: 1 } },
    ]).exec();
  }

  profileVisits(range: StatsRangeDto, profileId: UserDocument['_id']) {
    return this.users.aggregate<{ date: string; count: number }>([
      { $match: { _id: profileId } },
      ...this.dailyEntries(range, 'profileViewsByDay'),
      { $sort: { 'entries.k': 1 } },
      { $project: { _id: 0, date: '$entries.k', count: '$entries.v' } },
    ]).exec();
  }

  likesByDay(range: StatsRangeDto) {
    return this.posts.aggregate<{ date: string; count: number }>([
      ...this.dailyEntries(range, 'likesByDay'),
      { $group: { _id: '$entries.k', count: { $sum: '$entries.v' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ]).exec();
  }

  private dailyEntries(range: StatsRangeDto, field: 'loginsByDay' | 'profileViewsByDay' | 'likesByDay'): PipelineStage[] {
    this.validateRange(range);
    return [
      { $project: { username: 1, entries: { $objectToArray: { $ifNull: [`$${field}`, {}] } } } },
      { $unwind: '$entries' },
      { $match: { 'entries.k': { $gte: range.from, $lte: range.to } } },
    ];
  }

  private validateRange({ from, to }: StatsRangeDto) {
    if (from > to) throw new BadRequestException('La fecha Desde debe ser anterior o igual a Hasta.');
  }

  private byDate({ from, to }: StatsRangeDto) {
    this.validateRange({ from, to });
    return {
      deletedAt: null,
      createdAt: { $gte: new Date(from), $lt: new Date(Date.parse(to) + dayInMilliseconds) },
    };
  }

  private activeComments(range: StatsRangeDto): PipelineStage[] {
    return [
      { $match: this.byDate(range) },
      { $lookup: {
        from: this.posts.collection.name, localField: 'postId', foreignField: '_id',
        pipeline: [{ $match: { deletedAt: null } }, { $project: { title: 1 } }], as: 'post',
      } },
      { $unwind: '$post' },
    ];
  }
}
