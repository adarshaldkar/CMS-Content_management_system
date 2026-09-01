import { Injectable } from '@nestjs/common';
import {
  CreateNotificationDto,
  NotificationItem,
  NotificationPreferences,
  PushSubscriptionRecord,
} from '../../domain/models';
import { INotificationRepository } from '../interfaces/notification.repository.interface';
import { PostgresNotificationRepository } from '../postgres/postgres-notification.repository';
import { MongoNotificationRepository } from '../mongo/mongo-notification.repository';
import {
  type IRuntimeSwitchableRepository,
  type SupportedDbName,
} from '../repository-proxy';

@Injectable()
export class SeamlessNotificationRepository implements INotificationRepository, IRuntimeSwitchableRepository {
  private activeRepo: INotificationRepository;
  private fallbackRepo: INotificationRepository;
  private activeEngine: SupportedDbName;

  constructor(
    private readonly postgresRepo: PostgresNotificationRepository,
    private readonly mongoRepo: MongoNotificationRepository,
    activeEngine: SupportedDbName = 'postgres',
  ) {
    this.activeEngine = activeEngine;
    this.activeRepo = activeEngine === 'mongodb' ? mongoRepo : postgresRepo;
    this.fallbackRepo = activeEngine === 'mongodb' ? postgresRepo : mongoRepo;
  }

  __switchActive(engine: SupportedDbName): void {
    this.activeEngine = engine;
    this.activeRepo = engine === 'mongodb' ? this.mongoRepo : this.postgresRepo;
    this.fallbackRepo = engine === 'mongodb' ? this.postgresRepo : this.mongoRepo;
  }

  __activeDb(): SupportedDbName {
    return this.activeEngine;
  }

  async createOrAggregate(dto: CreateNotificationDto): Promise<NotificationItem> {
    try {
      return await this.activeRepo.createOrAggregate(dto);
    } catch {
      return await this.fallbackRepo.createOrAggregate(dto);
    }
  }

  async findByUserWithCursor(
    userId: string,
    cursor?: string,
    limit?: number,
    unreadOnly?: boolean,
  ): Promise<{ items: NotificationItem[]; nextCursor?: string | null; hasMore: boolean }> {
    try {
      return await this.activeRepo.findByUserWithCursor(userId, cursor, limit, unreadOnly);
    } catch {
      return await this.fallbackRepo.findByUserWithCursor(userId, cursor, limit, unreadOnly);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.activeRepo.getUnreadCount(userId);
    } catch {
      return await this.fallbackRepo.getUnreadCount(userId);
    }
  }

  async markAsRead(id: string, userId: string): Promise<NotificationItem | null> {
    try {
      return await this.activeRepo.markAsRead(id, userId);
    } catch {
      return await this.fallbackRepo.markAsRead(id, userId);
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    try {
      return await this.activeRepo.markAllAsRead(userId);
    } catch {
      return await this.fallbackRepo.markAllAsRead(userId);
    }
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      return await this.activeRepo.getPreferences(userId);
    } catch {
      return await this.fallbackRepo.getPreferences(userId);
    }
  }

  async updatePreferences(
    userId: string,
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    try {
      return await this.activeRepo.updatePreferences(userId, prefs);
    } catch {
      return await this.fallbackRepo.updatePreferences(userId, prefs);
    }
  }

  async savePushSubscription(record: Partial<PushSubscriptionRecord>): Promise<void> {
    try {
      await this.activeRepo.savePushSubscription(record);
    } catch {
      await this.fallbackRepo.savePushSubscription(record);
    }
  }

  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    try {
      await this.activeRepo.removePushSubscription(userId, endpoint);
    } catch {
      await this.fallbackRepo.removePushSubscription(userId, endpoint);
    }
  }
}
