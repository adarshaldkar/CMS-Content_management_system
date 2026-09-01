import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';
import {
  CreateNotificationDto,
  DeliveryStatus,
  NotificationItem,
  NotificationPreferences,
  NotificationType,
  PushSubscriptionRecord,
} from '../../domain/models';
import { INotificationRepository } from '../interfaces/notification.repository.interface';

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
export class PostgresNotificationRepository implements INotificationRepository, OnModuleInit {
  private readonly logger = new Logger(PostgresNotificationRepository.name);

  constructor(private readonly postgres: PostgresService) {}

  async onModuleInit(): Promise<void> {
    await this.initSchema();
  }

  private async initSchema(): Promise<void> {
    try {
      await this.postgres.pool.query(`
        CREATE TABLE IF NOT EXISTS cms_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
          actor_name VARCHAR(255) NOT NULL,
          actor_avatar TEXT,
          actor_count INT NOT NULL DEFAULT 1,
          actors_summary JSONB DEFAULT '[]'::jsonb,
          group_key VARCHAR(255),
          type VARCHAR(64) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          resource_type VARCHAR(64) NOT NULL,
          resource_id UUID NOT NULL,
          resource_slug VARCHAR(255),
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          read_at TIMESTAMPTZ,
          delivery_status VARCHAR(32) NOT NULL DEFAULT 'SENT',
          in_app_delivered_at TIMESTAMPTZ DEFAULT NOW(),
          email_delivered_at TIMESTAMPTZ,
          push_delivered_at TIMESTAMPTZ,
          delivery_errors JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user_inbox 
        ON cms_notifications (user_id, is_read, created_at DESC);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_active_group 
        ON cms_notifications (user_id, group_key) 
        WHERE is_read = FALSE AND group_key IS NOT NULL;

        CREATE TABLE IF NOT EXISTS cms_notification_preferences (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          channels JSONB NOT NULL DEFAULT '{"inApp": true, "email": true, "browserPush": false}'::jsonb,
          events JSONB NOT NULL DEFAULT '{
            "onArticlePublished": true,
            "onArticleFeedback": true,
            "onArticleLiked": true,
            "onArticleReposted": true,
            "onCommentReceived": true,
            "onCommentReply": true,
            "onCommentLiked": true,
            "onNewFollower": true,
            "onUserMentioned": true,
            "onSystemAnnouncement": true
          }'::jsonb,
          digest_frequency VARCHAR(32) NOT NULL DEFAULT 'instant',
          quiet_hours JSONB NOT NULL DEFAULT '{"enabled": false}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS cms_push_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_user_push_endpoint UNIQUE (user_id, endpoint)
        );
      `);
      this.logger.log('PostgreSQL notifications tables & indices initialized.');
    } catch (err: any) {
      this.logger.warn(`Failed to initialize notification tables (will retry on boot): ${err.message}`);
    }
  }

  async createOrAggregate(dto: CreateNotificationDto): Promise<NotificationItem> {
    const initialSummary = dto.actorId
      ? JSON.stringify([{ id: dto.actorId, name: dto.actorName, avatar: dto.actorAvatar }])
      : '[]';

    if (dto.groupKey) {
      // Concurrency-safe atomic upsert for grouped notifications
      const query = `
        INSERT INTO cms_notifications (
          user_id, actor_id, actor_name, actor_avatar, actor_count,
          actors_summary, group_key, type, title, message, resource_type,
          resource_id, resource_slug, is_read, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 1,
          $5::jsonb, $6, $7, $8, $9, $10,
          $11, $12, FALSE, NOW(), NOW()
        )
        ON CONFLICT (user_id, group_key) WHERE is_read = FALSE AND group_key IS NOT NULL
        DO UPDATE SET
          actor_count = cms_notifications.actor_count + 1,
          actor_name = EXCLUDED.actor_name,
          actor_avatar = EXCLUDED.actor_avatar,
          actors_summary = jsonb_insert(
            COALESCE(cms_notifications.actors_summary, '[]'::jsonb), '{0}',
            jsonb_build_object('id', EXCLUDED.actor_id, 'name', EXCLUDED.actor_name), true
          ),
          message = EXCLUDED.message,
          updated_at = NOW()
        RETURNING *;
      `;
      const values = [
        dto.userId,
        dto.actorId || null,
        dto.actorName,
        dto.actorAvatar || null,
        initialSummary,
        dto.groupKey,
        dto.type,
        dto.title,
        dto.message,
        dto.resourceType,
        dto.resourceId,
        dto.resourceSlug || null,
      ];
      const res = await this.postgres.pool.query(query, values);
      return this.mapRowToModel(res.rows[0]);
    }

    // Standard non-grouped notification insert
    const query = `
      INSERT INTO cms_notifications (
        user_id, actor_id, actor_name, actor_avatar, actor_count,
        actors_summary, group_key, type, title, message, resource_type,
        resource_id, resource_slug, is_read, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 1,
        $5::jsonb, NULL, $6, $7, $8, $9,
        $10, $11, FALSE, NOW(), NOW()
      )
      RETURNING *;
    `;
    const values = [
      dto.userId,
      dto.actorId || null,
      dto.actorName,
      dto.actorAvatar || null,
      initialSummary,
      dto.type,
      dto.title,
      dto.message,
      dto.resourceType,
      dto.resourceId,
      dto.resourceSlug || null,
    ];
    const res = await this.postgres.pool.query(query, values);
    return this.mapRowToModel(res.rows[0]);
  }

  async findByUserWithCursor(
    userId: string,
    cursor?: string,
    limit = 20,
    unreadOnly = false,
  ): Promise<{ items: NotificationItem[]; nextCursor?: string | null; hasMore: boolean }> {
    const safeLimit = Math.min(50, Math.max(1, limit));
    const conditions: string[] = ['user_id = $1'];
    const values: any[] = [userId];

    if (unreadOnly) {
      conditions.push('is_read = FALSE');
    }

    if (cursor) {
      values.push(cursor);
      conditions.push(`created_at < $${values.length}`);
    }

    values.push(safeLimit + 1);
    const query = `
      SELECT * FROM cms_notifications
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${values.length};
    `;

    const res = await this.postgres.pool.query(query, values);
    const rows = res.rows;
    const hasMore = rows.length > safeLimit;
    const items = (hasMore ? rows.slice(0, safeLimit) : rows).map((r) => this.mapRowToModel(r));
    const nextCursor = items.length > 0 && hasMore ? items[items.length - 1].createdAt : null;

    return { items, nextCursor, hasMore };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const res = await this.postgres.pool.query(
      `SELECT COUNT(*)::int as count FROM cms_notifications WHERE user_id = $1 AND is_read = FALSE;`,
      [userId],
    );
    return res.rows[0]?.count || 0;
  }

  async markAsRead(id: string, userId: string): Promise<NotificationItem | null> {
    const res = await this.postgres.pool.query(
      `UPDATE cms_notifications 
       SET is_read = TRUE, read_at = NOW(), updated_at = NOW() 
       WHERE id = $1 AND user_id = $2 
       RETURNING *;`,
      [id, userId],
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToModel(res.rows[0]);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const res = await this.postgres.pool.query(
      `UPDATE cms_notifications 
       SET is_read = TRUE, read_at = NOW(), updated_at = NOW() 
       WHERE user_id = $1 AND is_read = FALSE;`,
      [userId],
    );
    return res.rowCount || 0;
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const res = await this.postgres.pool.query(
      `SELECT * FROM cms_notification_preferences WHERE user_id = $1;`,
      [userId],
    );
    if (res.rows.length === 0) {
      return {
        userId,
        ...DEFAULT_PREFERENCES,
        updatedAt: new Date().toISOString(),
      };
    }
    const row = res.rows[0];
    return {
      userId: row.user_id,
      channels: row.channels,
      events: row.events,
      digestFrequency: row.digest_frequency,
      quietHours: row.quiet_hours,
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async updatePreferences(
    userId: string,
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated: NotificationPreferences = {
      userId,
      channels: { ...current.channels, ...prefs.channels },
      events: { ...current.events, ...prefs.events },
      digestFrequency: prefs.digestFrequency || current.digestFrequency,
      quietHours: { ...current.quietHours, ...prefs.quietHours },
      updatedAt: new Date().toISOString(),
    };

    const query = `
      INSERT INTO cms_notification_preferences (user_id, channels, events, digest_frequency, quiet_hours, updated_at)
      VALUES ($1, $2::jsonb, $3::jsonb, $4, $5::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        channels = EXCLUDED.channels,
        events = EXCLUDED.events,
        digest_frequency = EXCLUDED.digest_frequency,
        quiet_hours = EXCLUDED.quiet_hours,
        updated_at = NOW()
      RETURNING *;
    `;
    await this.postgres.pool.query(query, [
      userId,
      JSON.stringify(updated.channels),
      JSON.stringify(updated.events),
      updated.digestFrequency,
      JSON.stringify(updated.quietHours),
    ]);

    return updated;
  }

  async savePushSubscription(record: Partial<PushSubscriptionRecord>): Promise<void> {
    if (!record.userId || !record.endpoint || !record.keys) return;
    const query = `
      INSERT INTO cms_push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
      ON CONFLICT (user_id, endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        is_active = TRUE,
        updated_at = NOW();
    `;
    await this.postgres.pool.query(query, [
      record.userId,
      record.endpoint,
      record.keys.p256dh,
      record.keys.auth,
      record.userAgent || null,
    ]);
  }

  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.postgres.pool.query(
      `DELETE FROM cms_push_subscriptions WHERE user_id = $1 AND endpoint = $2;`,
      [userId, endpoint],
    );
  }

  private mapRowToModel(row: any): NotificationItem {
    return {
      id: row.id,
      userId: row.user_id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorAvatar: row.actor_avatar,
      actorCount: parseInt(row.actor_count, 10) || 1,
      actorsSummary: row.actors_summary || [],
      groupKey: row.group_key,
      type: row.type as NotificationType,
      title: row.title,
      message: row.message,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      resourceSlug: row.resource_slug,
      isRead: Boolean(row.is_read),
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      deliveryStatus: (row.delivery_status || 'SENT') as DeliveryStatus,
      inAppDeliveredAt: row.in_app_delivered_at ? new Date(row.in_app_delivered_at).toISOString() : null,
      emailDeliveredAt: row.email_delivered_at ? new Date(row.email_delivered_at).toISOString() : null,
      pushDeliveredAt: row.push_delivered_at ? new Date(row.push_delivered_at).toISOString() : null,
      deliveryErrors: row.delivery_errors || [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
