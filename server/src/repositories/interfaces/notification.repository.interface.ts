import {
  CreateNotificationDto,
  NotificationItem,
  NotificationPreferences,
  PushSubscriptionRecord,
} from '../../domain/models';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface INotificationRepository {
  createOrAggregate(dto: CreateNotificationDto): Promise<NotificationItem>;
  findByUserWithCursor(
    userId: string,
    cursor?: string,
    limit?: number,
    unreadOnly?: boolean,
  ): Promise<{ items: NotificationItem[]; nextCursor?: string | null; hasMore: boolean }>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<NotificationItem | null>;
  markAllAsRead(userId: string): Promise<number>;
  getPreferences(userId: string): Promise<NotificationPreferences>;
  updatePreferences(
    userId: string,
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences>;
  savePushSubscription(record: Partial<PushSubscriptionRecord>): Promise<void>;
  removePushSubscription(userId: string, endpoint: string): Promise<void>;
}
