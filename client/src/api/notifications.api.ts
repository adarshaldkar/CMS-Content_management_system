import { apiClient } from './client';

export const NotificationType = {
  ARTICLE_PUBLISHED: 'ARTICLE_PUBLISHED',
  ARTICLE_FEEDBACK: 'ARTICLE_FEEDBACK',
  ARTICLE_REJECTED: 'ARTICLE_REJECTED',
  ARTICLE_SCHEDULED: 'ARTICLE_SCHEDULED',
  ARTICLE_LIKED: 'ARTICLE_LIKED',
  ARTICLE_REPOSTED: 'ARTICLE_REPOSTED',
  COMMENT_RECEIVED: 'COMMENT_RECEIVED',
  COMMENT_REPLY: 'COMMENT_REPLY',
  COMMENT_LIKED: 'COMMENT_LIKED',
  NEW_FOLLOWER: 'NEW_FOLLOWER',
  USER_MENTIONED: 'USER_MENTIONED',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export interface NotificationItem {
  id: string;
  userId: string;
  actorId?: string | null;
  actorName: string;
  actorAvatar?: string | null;
  actorCount: number;
  actorsSummary: Array<{ id: string; name: string; avatar?: string }>;
  groupKey?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  resourceType: 'article' | 'comment' | 'user' | 'system';
  resourceId: string;
  resourceSlug?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface NotificationCursorResult {
  items: NotificationItem[];
  nextCursor?: string | null;
  hasMore: boolean;
  unreadCount: number;
}

export const notificationsApi = {
  async getInbox(params?: { cursor?: string; limit?: number; unreadOnly?: boolean }): Promise<NotificationCursorResult> {
    const res = await apiClient.get('/notifications', { params });
    return res.data;
  },

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead(): Promise<{ success: boolean; markedCount: number }> {
    const res = await apiClient.post('/notifications/mark-all-read');
    return res.data;
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const res = await apiClient.get('/notifications/preferences');
    return res.data;
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const res = await apiClient.patch('/notifications/preferences', prefs);
    return res.data;
  },

  async savePushSubscription(body: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }): Promise<{ success: boolean }> {
    const res = await apiClient.post('/notifications/push-subscription', body);
    return res.data;
  },
};
