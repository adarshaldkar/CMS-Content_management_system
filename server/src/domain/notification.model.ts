/**
 * Notification Domain Model
 *
 * Defines notification event types, delivery statuses, preferences, and inbox models.
 */

export enum NotificationType {
  // Editorial & Publishing Lifecycle
  ARTICLE_PUBLISHED = 'ARTICLE_PUBLISHED',
  ARTICLE_FEEDBACK = 'ARTICLE_FEEDBACK',
  ARTICLE_REJECTED = 'ARTICLE_REJECTED',
  ARTICLE_SCHEDULED = 'ARTICLE_SCHEDULED',

  // Social & Community Engagement
  ARTICLE_LIKED = 'ARTICLE_LIKED',
  ARTICLE_REPOSTED = 'ARTICLE_REPOSTED',
  COMMENT_RECEIVED = 'COMMENT_RECEIVED',
  COMMENT_REPLY = 'COMMENT_REPLY',
  COMMENT_LIKED = 'COMMENT_LIKED',
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  USER_MENTIONED = 'USER_MENTIONED',

  // System & Governance
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export interface NotificationActorSummary {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId?: string | null;
  actorName: string;
  actorAvatar?: string | null;
  actorCount: number;
  actorsSummary: NotificationActorSummary[];
  groupKey?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  resourceType: 'article' | 'comment' | 'user' | 'system';
  resourceId: string;
  resourceSlug?: string | null;
  isRead: boolean;
  readAt?: string | null;
  deliveryStatus: DeliveryStatus;
  inAppDeliveredAt?: string | null;
  emailDeliveredAt?: string | null;
  pushDeliveredAt?: string | null;
  deliveryErrors?: Array<{
    channel: 'inApp' | 'email' | 'browserPush';
    error: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationDto {
  userId: string;
  actorId?: string | null;
  actorName: string;
  actorAvatar?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  resourceType: 'article' | 'comment' | 'user' | 'system';
  resourceId: string;
  resourceSlug?: string | null;
  groupKey?: string | null;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    browserPush: boolean;
  };
  events: {
    onArticlePublished: boolean;
    onArticleFeedback: boolean;
    onArticleLiked: boolean;
    onArticleReposted: boolean;
    onCommentReceived: boolean;
    onCommentReply: boolean;
    onCommentLiked: boolean;
    onNewFollower: boolean;
    onUserMentioned: boolean;
    onSystemAnnouncement: boolean;
  };
  digestFrequency: 'instant' | 'daily_digest' | 'weekly_digest';
  quietHours: {
    enabled: boolean;
    startUtc?: string;
    endUtc?: string;
  };
  updatedAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCursorResult {
  items: NotificationItem[];
  nextCursor?: string | null;
  hasMore: boolean;
  unreadCount: number;
}
