import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  CreateNotificationDto,
  NotificationCursorResult,
  NotificationItem,
  NotificationPreferences,
  NotificationType,
  PushSubscriptionRecord,
} from '../../domain/models';
import {
  type INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../repositories/interfaces/notification.repository.interface';
import { RedisService } from '../../redis/redis.service';
import { QUEUE_NAMES, JOB_NAMES } from '../../bull/bull-queue.constants';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: INotificationRepository,
    private readonly redisService: RedisService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION_OUTBOX)
    private readonly notificationQueue: Queue,
  ) {}

  /**
   * Asynchronously enqueues a notification onto the `notification-outbox` queue
   * so delivery benefits from BullMQ retries/backoff and does not block the
   * publishing request. Returns a stable job id for deduplication.
   */
  async enqueue(dto: CreateNotificationDto): Promise<{ queued: boolean; jobId: string }> {
    const jobId = [
      'notif',
      dto.userId,
      dto.type,
      dto.resourceId,
      dto.actorId || 'system',
    ].join('_');
    const job = await this.notificationQueue.add(JOB_NAMES.DISPATCH_NOTIFICATION, { dto }, {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: false,
    });
    return { queued: true, jobId: String(job.id) };
  }

  /**
   * Dispatches a notification to a recipient after evaluating preferences and Redis deduplication.
   */
  async notify(dto: CreateNotificationDto): Promise<NotificationItem | null> {
    // 1. Self-notification suppression
    if (dto.actorId && dto.actorId === dto.userId) {
      return null;
    }

    // 2. User preference check
    const prefs = await this.notificationRepo.getPreferences(dto.userId);
    if (!this.shouldDeliverInApp(prefs, dto.type)) {
      return null;
    }

    // 3. Redis deduplication lease (24-hour TTL)
    if (dto.actorId && this.redisService.isHealthy()) {
      const client = this.redisService.getClient();
      if (client) {
        const dedupKey = `dedup:notif:${dto.userId}:${dto.type}:${dto.resourceId}:${dto.actorId}`;
        try {
          const acquired = await client.set(dedupKey, '1', 'EX', 86400, 'NX');
          if (!acquired) {
            // Duplicate notification within 24h: safely discard
            return null;
          }
        } catch (err: any) {
          this.logger.warn(`Redis deduplication lease error (proceeding to DB): ${err.message}`);
        }
      }
    }

    // 4. Persistence with concurrency-safe atomic aggregation
    const notification = await this.notificationRepo.createOrAggregate(dto);

    // 5. Fast Redis unread counter increment
    let unreadCount = 1;
    if (this.redisService.isHealthy()) {
      const client = this.redisService.getClient();
      if (client) {
        try {
          unreadCount = await client.incr(`notif:unread:${dto.userId}`);
        } catch {}
      }
    }

    // 6. Broadcast to cluster nodes for real-time SSE stream delivery
    await this.redisService.publish(`cms:channel:notifications:${dto.userId}`, {
      event: 'NOTIFICATION_RECEIVED',
      data: {
        notification,
        unreadCount,
      },
    });

    return notification;
  }

  /**
   * Retrieves cursor-paginated notifications for a user.
   */
  async getInbox(
    userId: string,
    cursor?: string,
    limit = 20,
    unreadOnly = false,
  ): Promise<NotificationCursorResult> {
    const { items, nextCursor, hasMore } = await this.notificationRepo.findByUserWithCursor(
      userId,
      cursor,
      limit,
      unreadOnly,
    );
    const unreadCount = await this.getUnreadCount(userId);
    return { items, nextCursor, hasMore, unreadCount };
  }

  /**
   * Fast unread counter with authoritative DB reconciliation.
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (this.redisService.isHealthy()) {
      const client = this.redisService.getClient();
      if (client) {
        try {
          const cached = await client.get(`notif:unread:${userId}`);
          if (cached !== null) {
            return Math.max(0, parseInt(cached, 10) || 0);
          }
        } catch {}
      }
    }

    // Cold cache miss: query database authoritative truth and populate Redis
    const dbCount = await this.notificationRepo.getUnreadCount(userId);
    if (this.redisService.isHealthy()) {
      const client = this.redisService.getClient();
      if (client) {
        client.set(`notif:unread:${userId}`, String(dbCount), 'EX', 604800).catch(() => {});
      }
    }
    return dbCount;
  }

  /**
   * Marks a single notification as read.
   */
  async markAsRead(id: string, userId: string): Promise<NotificationItem | null> {
    const item = await this.notificationRepo.markAsRead(id, userId);
    if (item && this.redisService.isHealthy()) {
      const client = this.redisService.getClient();
      if (client) {
        try {
          const count = await client.decr(`notif:unread:${userId}`);
          if (count < 0) {
            await client.set(`notif:unread:${userId}`, '0', 'EX', 604800);
          }
        } catch {}
      }
    }
    return item;
  }

  /**
   * Marks all unread notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; markedCount: number }> {
    const markedCount = await this.notificationRepo.markAllAsRead(userId);
    // Reconcile the fast counter from the authoritative DB count instead of a
    // blind reset, so a concurrent new notification is not lost in the window
    // between the DB write and the Redis reset.
    if (this.redisService.isHealthy()) {
      const client = this.redisService.getClient();
      if (client) {
        try {
          const dbCount = await this.notificationRepo.getUnreadCount(userId);
          await client.set(`notif:unread:${userId}`, String(dbCount), 'EX', 604800);
        } catch (err: any) {
          this.logger.warn(`markAllAsRead Redis reconciliation failed: ${err.message}`);
        }
      }
    }
    return { success: true, markedCount };
  }

  /**
   * User preferences management.
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    return this.notificationRepo.getPreferences(userId);
  }

  async updatePreferences(
    userId: string,
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    return this.notificationRepo.updatePreferences(userId, prefs);
  }

  /**
   * Web Push subscription management.
   */
  async savePushSubscription(record: Partial<PushSubscriptionRecord>): Promise<void> {
    return this.notificationRepo.savePushSubscription(record);
  }

  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    return this.notificationRepo.removePushSubscription(userId, endpoint);
  }

  private shouldDeliverInApp(prefs: NotificationPreferences, type: NotificationType): boolean {
    if (!prefs.channels?.inApp) return false;
    if (type === NotificationType.SYSTEM_ANNOUNCEMENT) return true;

    const eventMap: Record<NotificationType, keyof NotificationPreferences['events']> = {
      [NotificationType.ARTICLE_PUBLISHED]: 'onArticlePublished',
      [NotificationType.ARTICLE_FEEDBACK]: 'onArticleFeedback',
      [NotificationType.ARTICLE_REJECTED]: 'onArticleFeedback',
      [NotificationType.ARTICLE_SCHEDULED]: 'onArticlePublished',
      [NotificationType.ARTICLE_LIKED]: 'onArticleLiked',
      [NotificationType.ARTICLE_REPOSTED]: 'onArticleReposted',
      [NotificationType.COMMENT_RECEIVED]: 'onCommentReceived',
      [NotificationType.COMMENT_REPLY]: 'onCommentReply',
      [NotificationType.COMMENT_LIKED]: 'onCommentLiked',
      [NotificationType.NEW_FOLLOWER]: 'onNewFollower',
      [NotificationType.USER_MENTIONED]: 'onUserMentioned',
      [NotificationType.SYSTEM_ANNOUNCEMENT]: 'onSystemAnnouncement',
    };

    const key = eventMap[type];
    // Fail-closed: an unknown notification type must not bypass preferences.
    if (!key) {
      this.logger.warn(`Unknown notification type [${type}] — suppressing in-app delivery (fail-closed).`);
      return false;
    }
    // Missing events object defaults to deliver-everything for existing users.
    return prefs.events ? Boolean(prefs.events[key]) : true;
  }
}
