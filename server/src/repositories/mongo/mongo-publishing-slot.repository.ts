import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import {
  AuthorSlotAssignmentSchemaClass,
  PublishingSlotSchemaClass,
  type PublishingSlotDocument,
} from './publishing-slot.schema';
import type {
  AssignAuthorSlotDto,
  AuthorClearanceInfo,
  AuthorSlotAssignment,
  CreatePublishingSlotDto,
  PublishingSlot,
  UpdatePublishingSlotDto,
} from '../../domain/models';
import type { IPublishingSlotRepository } from '../interfaces/publishing-slot.repository.interface';

@Injectable()
export class MongoPublishingSlotRepository implements IPublishingSlotRepository {
  private readonly logger = new Logger(MongoPublishingSlotRepository.name);

  constructor(
    @InjectModel(PublishingSlotSchemaClass.name)
    private readonly slotModel: Model<PublishingSlotDocument>,
    @InjectModel(AuthorSlotAssignmentSchemaClass.name)
    private readonly assignmentModel: Model<AuthorSlotAssignmentSchemaClass>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private toSlot(doc: PublishingSlotDocument): PublishingSlot {
    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      dispatchTime: doc.dispatchTime,
      timezone: doc.timezone || 'UTC',
      daysActive: doc.daysActive || 'ALL',
      maxArticlesPerSlot: Number(doc.maxArticlesPerSlot ?? 5),
      staggerMinutes: Number(doc.staggerMinutes ?? 5),
      isActive: Boolean(doc.isActive),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private toAssignment(doc: any): AuthorSlotAssignment {
    return {
      id: doc._id.toString(),
      authorId: doc.authorId,
      slotId: doc.slotId,
      autoPublishEnabled: Boolean(doc.autoPublishEnabled),
      dailyQuota: Number(doc.dailyQuota ?? 2),
      assignedBy: doc.assignedBy ?? null,
      createdAt: doc.createdAt,
      authorName: doc.authorName,
      authorEmail: doc.authorEmail,
      authorAvatar: doc.authorAvatar,
      slotName: doc.slotName,
      slotDispatchTime: doc.slotDispatchTime,
    };
  }

  private async queuedCount(slotId: string): Promise<number> {
    try {
      const articles = this.connection.model('ArticleSchemaClass');
      return await articles.countDocuments({
        publishingSlotId: slotId,
        status: 'scheduled',
      });
    } catch (err: any) {
      this.logger.debug(`queuedCount fallback empty: ${err.message}`);
      return 0;
    }
  }

  private async assignedCount(slotId: string): Promise<number> {
    return this.assignmentModel.countDocuments({ slotId }).exec();
  }

  private async decorateSlot(
    doc: PublishingSlotDocument,
  ): Promise<PublishingSlot> {
    const slot = this.toSlot(doc);
    const id = slot.id;
    slot.queuedCount = await this.queuedCount(id);
    slot.assignedAuthorCount = await this.assignedCount(id);
    return slot;
  }

  async findAllSlots(): Promise<PublishingSlot[]> {
    const docs = await this.slotModel.find().sort({ dispatchTime: 1 }).exec();
    return Promise.all(docs.map((doc) => this.decorateSlot(doc)));
  }

  async findSlotById(id: string): Promise<PublishingSlot | null> {
    const byId = await this.slotModel.findOne({ _id: id }).exec();
    if (byId) return this.decorateSlot(byId);
    const bySlug = await this.slotModel.findOne({ slug: id }).exec();
    return bySlug ? this.decorateSlot(bySlug) : null;
  }

  async findSlotBySlug(slug: string): Promise<PublishingSlot | null> {
    const doc = await this.slotModel.findOne({ slug }).exec();
    return doc ? this.decorateSlot(doc) : null;
  }

  async createSlot(dto: CreatePublishingSlotDto): Promise<PublishingSlot> {
    const slug =
      dto.slug ||
      dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const doc = await this.slotModel.create({
      name: dto.name,
      slug,
      dispatchTime: dto.dispatchTime,
      timezone: dto.timezone || 'UTC',
      daysActive: dto.daysActive || 'ALL',
      maxArticlesPerSlot: dto.maxArticlesPerSlot ?? 5,
      staggerMinutes: dto.staggerMinutes ?? 5,
      isActive: dto.isActive !== false,
    });
    return this.toSlot(doc);
  }

  async updateSlot(id: string, dto: UpdatePublishingSlotDto): Promise<PublishingSlot | null> {
    const update: Record<string, unknown> = { ...dto };
    const doc = await this.slotModel
      .findOneAndUpdate({ _id: id }, { $set: update }, { new: true })
      .exec();
    if (!doc) {
      const bySlug = await this.slotModel
        .findOneAndUpdate({ slug: id }, { $set: update }, { new: true })
        .exec();
      return bySlug ? this.decorateSlot(bySlug) : null;
    }
    return this.toSlot(doc);
  }

  async deleteSlot(id: string): Promise<boolean> {
    await this.assignmentModel.deleteMany({ slotId: id }).exec();
    const result = await this.slotModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount > 0) return true;
    const bySlug = await this.slotModel.deleteOne({ slug: id }).exec();
    return bySlug.deletedCount > 0;
  }

  async findAllAssignments(): Promise<AuthorSlotAssignment[]> {
    const docs = await this.assignmentModel.find().sort({ createdAt: -1 }).exec();

    const populated = await Promise.all(
      docs.map(async (doc) => {
        const base = this.toAssignment(doc);
        const slot = await this.slotModel.findById(doc.slotId).exec();
        if (slot) {
          base.slotName = slot.name;
          base.slotDispatchTime = slot.dispatchTime;
        }
        try {
          const users = this.connection.model('UserSchemaClass');
          const user = await users.findById(doc.authorId).exec();
          if (user) {
            base.authorName = user.name;
            base.authorEmail = user.email;
            base.authorAvatar = user.avatarUrl ?? null;
          }
        } catch (err: any) {
          this.logger.debug(`Author populate note: ${err.message}`);
        }
        return base;
      }),
    );

    return populated;
  }

  async findAssignmentByAuthorId(authorId: string): Promise<AuthorSlotAssignment | null> {
    const doc = await this.assignmentModel.findOne({ authorId }).exec();
    if (!doc) return null;

    const base = this.toAssignment(doc);
    const slot = await this.slotModel.findById(doc.slotId).exec();
    if (slot) {
      base.slotName = slot.name;
      base.slotDispatchTime = slot.dispatchTime;
    }
    try {
      const users = this.connection.model('UserSchemaClass');
      const user = await users.findById(authorId).exec();
      if (user) {
        base.authorName = user.name;
        base.authorEmail = user.email;
        base.authorAvatar = user.avatarUrl ?? null;
      }
    } catch (err: any) {
      this.logger.debug(`Author populate note: ${err.message}`);
    }
    return base;
  }

  async assignAuthorToSlot(dto: AssignAuthorSlotDto, assignedBy?: string): Promise<AuthorSlotAssignment> {
    await this.assignmentModel
      .findOneAndUpdate(
        { authorId: dto.authorId },
        {
          $set: {
            slotId: dto.slotId,
            autoPublishEnabled: dto.autoPublishEnabled !== false,
            dailyQuota: dto.dailyQuota ?? 2,
            assignedBy: assignedBy || null,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    const populated = await this.findAssignmentByAuthorId(dto.authorId);
    if (!populated) throw new Error('Failed to retrieve created author slot assignment');
    return populated;
  }

  async revokeAuthorAssignment(authorId: string): Promise<boolean> {
    const result = await this.assignmentModel.deleteOne({ authorId }).exec();
    return result.deletedCount > 0;
  }

  async getAuthorClearance(authorId: string): Promise<AuthorClearanceInfo> {
    const assignment = await this.findAssignmentByAuthorId(authorId);
    if (!assignment || !assignment.autoPublishEnabled) {
      return { hasSlot: false, slot: null, assignment: null, nextEstimatedPublishAt: null };
    }
    const slot = await this.findSlotById(assignment.slotId);
    return {
      hasSlot: true,
      slot,
      assignment,
      nextEstimatedPublishAt: slot ? slot.dispatchTime : null,
    };
  }

  async getQueuedArticlesCount(slotId: string): Promise<number> {
    return this.queuedCount(slotId);
  }

  async getUpcomingScheduledArticles(limit = 10): Promise<any[]> {
    try {
      const articles = this.connection.model('ArticleSchemaClass');
      const docs = await articles
        .find({ status: 'scheduled' })
        .sort({ scheduledAt: 1 })
        .limit(limit)
        .exec();
      return docs.map((a: any) => ({
        id: a._id.toString(),
        title: a.title,
        slug: a.slug,
        status: a.status,
        scheduledAt: a.scheduledAt,
        coverImage: a.coverImage ?? null,
        authorId: a.authorId,
      }));
    } catch (err: any) {
      this.logger.debug(`Upcoming scheduled articles fallback: ${err.message}`);
      return [];
    }
  }
}