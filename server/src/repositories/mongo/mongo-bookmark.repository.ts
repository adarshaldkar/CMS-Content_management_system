import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Bookmark, CreateBookmarkDto, PaginatedResult } from '../../domain/models';
import { BookmarkSchemaClass, type BookmarkDocument } from './bookmark.schema';
import type { IBookmarkRepository } from '../interfaces/bookmark.repository.interface';

@Injectable()
export class MongoBookmarkRepository implements IBookmarkRepository {
  constructor(
    @InjectModel(BookmarkSchemaClass.name)
    private readonly bookmarkModel: Model<BookmarkDocument>,
  ) {}

  private toDomain(doc: BookmarkDocument): Bookmark {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      articleId: doc.articleId,
      createdAt: doc.createdAt,
    };
  }

  async findByUser(userId: string, page: number, limit: number): Promise<PaginatedResult<Bookmark>> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.bookmarkModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookmarkModel.countDocuments({ userId }).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findOne(userId: string, articleId: string): Promise<Bookmark | null> {
    const doc = await this.bookmarkModel.findOne({ userId, articleId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async create(dto: CreateBookmarkDto): Promise<Bookmark> {
    const doc = await this.bookmarkModel.findOneAndUpdate(
      { userId: dto.userId, articleId: dto.articleId },
      { $setOnInsert: dto },
      { new: true, upsert: true },
    );
    return this.toDomain(doc);
  }

  async delete(userId: string, articleId: string): Promise<boolean> {
    const result = await this.bookmarkModel
      .deleteOne({ userId, articleId })
      .exec();
    return result.deletedCount > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    return this.bookmarkModel.countDocuments({ articleId }).exec();
  }
}