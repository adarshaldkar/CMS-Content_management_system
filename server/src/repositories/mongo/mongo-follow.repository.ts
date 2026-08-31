import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  CreateFollowDto,
  Follow,
  FollowQueryFilters,
  FollowTargetType,
  PaginatedResult,
} from '../../domain/models';
import { FollowSchemaClass, type FollowDocument } from './follow.schema';
import type { IFollowRepository } from '../interfaces/follow.repository.interface';

@Injectable()
export class MongoFollowRepository implements IFollowRepository {
  constructor(
    @InjectModel(FollowSchemaClass.name)
    private readonly followModel: Model<FollowDocument>,
  ) {}

  private toDomain(doc: FollowDocument): Follow {
    return {
      id: doc._id.toString(),
      followerId: doc.followerId,
      targetType: doc.targetType as FollowTargetType,
      targetId: doc.targetId,
      createdAt: doc.createdAt,
    };
  }

  async findOne(
    followerId: string,
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<Follow | null> {
    const doc = await this.followModel
      .findOne({ followerId, targetType, targetId })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findMany(filters: FollowQueryFilters): Promise<PaginatedResult<Follow>> {
    const query: Record<string, unknown> = {};
    if (filters.followerId) query.followerId = filters.followerId;
    if (filters.targetType) query.targetType = filters.targetType;
    if (filters.targetId) query.targetId = filters.targetId;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      this.followModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.followModel.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async create(dto: CreateFollowDto): Promise<Follow> {
    const doc = await this.followModel.findOneAndUpdate(
      {
        followerId: dto.followerId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
      { $setOnInsert: dto },
      { new: true, upsert: true },
    );
    return this.toDomain(doc);
  }

  async delete(
    followerId: string,
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<boolean> {
    const result = await this.followModel
      .deleteOne({ followerId, targetType, targetId })
      .exec();
    return result.deletedCount > 0;
  }

  async countFollowers(targetType: FollowTargetType, targetId: string): Promise<number> {
    return this.followModel.countDocuments({ targetType, targetId }).exec();
  }

  async countFollowing(followerId: string, targetType: FollowTargetType): Promise<number> {
    return this.followModel.countDocuments({ followerId, targetType }).exec();
  }
}