import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  Comment,
  CommentQueryFilters,
  CreateCommentDto,
  UpdateCommentDto,
} from '../../domain/models';
import { CommentStatus } from '../../domain/models';
import { CommentSchemaClass, type CommentDocument } from './comment.schema';
import type { ICommentRepository } from '../interfaces/comment.repository.interface';

@Injectable()
export class MongoCommentRepository implements ICommentRepository {
  constructor(
    @InjectModel(CommentSchemaClass.name)
    private readonly commentModel: Model<CommentDocument>,
  ) {}

  private toDomain(doc: CommentDocument): Comment {
    return {
      id: doc._id.toString(),
      articleId: doc.articleId,
      parentId: doc.parentId,
      authorId: doc.authorId,
      authorName: doc.authorName,
      authorAvatar: doc.authorAvatar,
      body: doc.body,
      status: doc.status as CommentStatus,
      moderationNote: doc.moderationNote,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt,
    };
  }

  async findById(id: string): Promise<Comment | null> {
    const doc = await this.commentModel
      .findOne({ _id: id, deletedAt: null })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findMany(filters: CommentQueryFilters): Promise<Comment[]> {
    const query: Record<string, unknown> = { deletedAt: null };

    if (filters.articleId) query.articleId = filters.articleId;
    if (filters.authorId) query.authorId = filters.authorId;
    query.status = filters.status ?? CommentStatus.VISIBLE;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const docs = await this.commentModel
      .find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(
    dto: CreateCommentDto & { authorId: string; authorName: string; authorAvatar: string | null },
  ): Promise<Comment> {
    const doc = await this.commentModel.create({
      articleId: dto.articleId,
      parentId: dto.parentId ?? null,
      authorId: dto.authorId,
      authorName: dto.authorName,
      authorAvatar: dto.authorAvatar,
      body: dto.body,
      status: CommentStatus.VISIBLE,
      moderationNote: null,
      deletedAt: null,
    });
    return this.toDomain(doc);
  }

  async update(id: string, dto: UpdateCommentDto): Promise<Comment> {
    const update: Record<string, unknown> = {};
    if (dto.body !== undefined) update.body = dto.body;
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.moderationNote !== undefined) update.moderationNote = dto.moderationNote;

    const doc = await this.commentModel
      .findOneAndUpdate(
        { _id: id },
        { $set: update },
        { new: true },
      )
      .exec();
    if (!doc) throw new Error('Comment not found');
    return this.toDomain(doc);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.commentModel
      .updateOne(
        { _id: id, deletedAt: null },
        {
          $set: {
            deletedAt: new Date(),
            status: CommentStatus.REMOVED,
          },
        },
      )
      .exec();
    return result.modifiedCount > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    return this.commentModel
      .countDocuments({
        articleId,
        deletedAt: null,
        status: CommentStatus.VISIBLE,
      })
      .exec();
  }
}