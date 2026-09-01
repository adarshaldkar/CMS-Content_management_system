import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateNotificationDto,
  DeliveryStatus,
  NotificationItem,
  NotificationPreferences,
  NotificationType,
  PushSubscriptionRecord,
} from '../../domain/models';
import { INotificationRepository } from '../interfaces/notification.repository.interface';
import {
  NotificationDocument,
  NotificationPreferencesSchemaClass,
  NotificationSchemaClass,
  PushSubscriptionSchemaClass,
} from './notification.schema';

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'updatedAt'> = {
  channels: {
    inApp: true,
    email: true,
    browserPush: false,
  },
  events: {
    onArticlePublished: true,
    onArticleFeedback: true,
    onArticleLiked: true,
    onArticleReposted: true,
    onCommentReceived: true,
    onCommentReply: true,
    onCommentLiked: true,
    onNewFollower: true,
    onUserMentioned: true,
    onSystemAnnouncement: true,
  },
  digestFrequency: 'instant',
  quietHours: {
    enabled: false,
  },
};

@Injectable()
export class MongoNotificationRepository implements INotificationRepository {
  constructor(
    @InjectModel(NotificationSchemaClass.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreferencesSchemaClass.name)
    private readonly prefModel: Model<NotificationPreferencesSchemaClass>,
    @InjectModel(PushSubscriptionSchemaClass.name)
    private readonly pushModel: Model<PushSubscriptionSchemaClass>,
  ) {}

  async createOrAggregate(dto: CreateNotificationDto): Promise<NotificationItem> {
    const actorSummary = dto.actorId
      ? [{ id: dto.actorId, name: dto.actorName, avatar: dto.actorAvatar || undefined }]
      : [];

    if (dto.groupKey) {
      // Concurrency-safe atomic upsert for grouped notifications in Mongo
      const doc = await this.notificationModel.findOneAndUpdate(
        { userId: dto.userId, groupKey: dto.groupKey, isRead: false },
        {
          $inc: { actorCount: 1 },
          $set: {
            message: dto.message,
            actorName: dto.actorName,
            actorAvatar: dto.actorAvatar || undefined,
            updatedAt: new Date(),
          },
          $push: {
            actorsSummary: {
              $each: actorSummary,
              $position: 0,
              $slice: 5,
            },
          },
          $setOnInsert: {
            userId: dto.userId,
            actorId: dto.actorId || undefined,
            type: dto.type,
            title: dto.title,
            resourceType: dto.resourceType,
            resourceId: dto.resourceId,
            resourceSlug: dto.resourceSlug || undefined,
            isRead: false,
            deliveryStatus: DeliveryStatus.SENT,
            inAppDeliveredAt: new Date(),
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return this.mapDocToModel(doc);
    }

    const doc = await this.notificationModel.create({
      userId: dto.userId,
      actorId: dto.actorId || undefined,
      actorName: dto.actorName,
      actorAvatar: dto.actorAvatar || undefined,
      actorCount: 1,
      actorsSummary: actorSummary,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      resourceSlug: dto.resourceSlug || undefined,
      isRead: false,
      deliveryStatus: DeliveryStatus.SENT,
      inAppDeliveredAt: new Date(),
    });
    return this.mapDocToModel(doc);
  }

  async findByUserWithCursor(
    userId: string,
    cursor?: string,
    limit = 20,
    unreadOnly = false,
  ): Promise<{ items: NotificationItem[]; nextCursor?: string | null; hasMore: boolean }> {
    const safeLimit = Math.min(50, Math.max(1, limit));
    const filter: any = { userId };
    if (unreadOnly) filter.isRead = false;
    if (cursor) filter.createdAt = { $lt: new Date(cursor) };

    const docs = await this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit + 1)
      .exec();

    const hasMore = docs.length > safeLimit;
    const items = (hasMore ? docs.slice(0, safeLimit) : docs).map((d) => this.mapDocToModel(d));
    const nextCursor = items.length > 0 && hasMore ? items[items.length - 1].createdAt : null;

    return { items, nextCursor, hasMore };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, isRead: false }).exec();
  }

  async markAsRead(id: string, userId: string): Promise<NotificationItem | null> {
    const doc = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );
    if (!doc) return null;
    return this.mapDocToModel(doc);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const res = await this.notificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
    return res.modifiedCount || 0;
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const doc = await this.prefModel.findOne({ userId }).exec();
    if (!doc) {
      return {
        userId,
        ...DEFAULT_PREFERENCES,
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      userId: doc.userId,
      channels: doc.channels,
      events: doc.events as any,
      digestFrequency: (doc.digestFrequency || 'instant') as any,
      quietHours: doc.quietHours,
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async updatePreferences(
    userId: string,
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated = await this.prefModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          channels: { ...current.channels, ...prefs.channels },
          events: { ...current.events, ...prefs.events },
          digestFrequency: prefs.digestFrequency || current.digestFrequency,
          quietHours: { ...current.quietHours, ...prefs.quietHours },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return {
      userId: updated.userId,
      channels: updated.channels,
      events: updated.events as any,
      digestFrequency: updated.digestFrequency as any,
      quietHours: updated.quietHours,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async savePushSubscription(record: Partial<PushSubscriptionRecord>): Promise<void> {
    if (!record.userId || !record.endpoint || !record.keys) return;
    await this.pushModel.findOneAndUpdate(
      { userId: record.userId, endpoint: record.endpoint },
      {
        $set: {
          keys: record.keys,
          userAgent: record.userAgent,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }

  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.pushModel.deleteOne({ userId, endpoint }).exec();
  }

  private mapDocToModel(doc: any): NotificationItem {
    return {
      id: doc._id?.toString() || doc.id,
      userId: doc.userId,
      actorId: doc.actorId,
      actorName: doc.actorName,
      actorAvatar: doc.actorAvatar,
      actorCount: doc.actorCount || 1,
      actorsSummary: doc.actorsSummary || [],
      groupKey: doc.groupKey,
      type: doc.type as NotificationType,
      title: doc.title,
      message: doc.message,
      resourceType: doc.resourceType,
      resourceId: doc.resourceId,
      resourceSlug: doc.resourceSlug,
      isRead: Boolean(doc.isRead),
      readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
      deliveryStatus: (doc.deliveryStatus || 'SENT') as DeliveryStatus,
      inAppDeliveredAt: doc.inAppDeliveredAt ? new Date(doc.inAppDeliveredAt).toISOString() : null,
      emailDeliveredAt: doc.emailDeliveredAt ? new Date(doc.emailDeliveredAt).toISOString() : null,
      pushDeliveredAt: doc.pushDeliveredAt ? new Date(doc.pushDeliveredAt).toISOString() : null,
      deliveryErrors: doc.deliveryErrors || [],
      createdAt: (doc.createdAt || new Date()).toISOString(),
      updatedAt: (doc.updatedAt || new Date()).toISOString(),
    };
  }
}
