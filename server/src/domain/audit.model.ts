export enum AuditEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  LOGOUT_ALL_SESSIONS = 'LOGOUT_ALL_SESSIONS',
  REGISTER_SUCCESS = 'REGISTER_SUCCESS',
  ROLE_CHANGED = 'ROLE_CHANGED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  REFRESH_TOKEN_REUSE = 'REFRESH_TOKEN_REUSE',
  DB_SWITCH_ATTEMPT = 'DB_SWITCH_ATTEMPT',
  DB_SWITCH_SUCCESS = 'DB_SWITCH_SUCCESS',
  DB_SWITCH_FAILURE = 'DB_SWITCH_FAILURE',
  ARTICLE_CREATED = 'ARTICLE_CREATED',
  ARTICLE_UPDATED = 'ARTICLE_UPDATED',
  ARTICLE_DELETED = 'ARTICLE_DELETED',
  ARTICLE_STATUS_CHANGED = 'ARTICLE_STATUS_CHANGED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  COMMENT_CREATED = 'COMMENT_CREATED',
  COMMENT_DELETED = 'COMMENT_DELETED',
  BOOKMARK_CREATED = 'BOOKMARK_CREATED',
  BOOKMARK_DELETED = 'BOOKMARK_DELETED',
  LIKE_TOGGLED = 'LIKE_TOGGLED',
  FOLLOW_CREATED = 'FOLLOW_CREATED',
  FOLLOW_DELETED = 'FOLLOW_DELETED',
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: AuditEventType;
  resource: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  ipAddress: string | null;
  userAgent: string | null;
  referenceId: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateAuditLogDto {
  actorId?: string | null;
  action: AuditEventType;
  resource: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  ipAddress?: string | null;
  userAgent?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
}
