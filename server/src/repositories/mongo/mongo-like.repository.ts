import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CreateLikeDto, Like } from '../../domain/models';
import { LikeSchemaClass, type LikeDocument } from './like.schema';
import type { ILikeRepository } from '../interfaces/like.repository.interface';

@Injectable()
export class MongoLikeRepository implements ILikeRepository {
  constructor(
    @InjectModel(LikeSchemaClass.name)
    private readonly likeModel: Model<LikeDocument>,
  ) {}

  private toDomain(doc: LikeDocument): Like {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      articleId: doc.articleId,
      createdAt: doc.createdAt,
    };
  }

  async findOne(userId: string, articleId: string): Promise<Like | null> {
    const doc = await this.likeModel.findOne({ userId, articleId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async create(dto: CreateLikeDto): Promise<Like> {
    const doc = await this.likeModel.findOneAndUpdate(
      { userId: dto.userId, articleId: dto.articleId },
      { $setOnInsert: dto },
      { new: true, upsert: true },
    );
    return this.toDomain(doc);
  }

  async delete(userId: string, articleId: string): Promise<boolean> {
    const result = await this.likeModel.deleteOne({ userId, articleId }).exec();
    return result.deletedCount > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    return this.likeModel.countDocuments({ articleId }).exec();
  }
}