// ─── Comment Model ────────────────────────────────────────────────────────────

export enum CommentStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  REMOVED = 'removed',
  REPORTED = 'reported',
}

export interface Comment {
  id: string;
  articleId: string;
  parentId: string | null; // for threaded replies
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string; // sanitized
  status: CommentStatus;
  moderationNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateCommentDto {
  articleId: string;
  parentId?: string | null;
  body: string;
}

export interface UpdateCommentDto {
  body?: string;
  status?: CommentStatus;
  moderationNote?: string | null;
}

export interface CommentQueryFilters {
  articleId?: string;
  authorId?: string;
  status?: CommentStatus;
  page?: number;
  limit?: number;
}

// ─── Bookmark Model ───────────────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  userId: string;
  articleId: string;
  createdAt: Date;
}

export interface CreateBookmarkDto {
  userId: string;
  articleId: string;
}

// ─── Like Model ───────────────────────────────────────────────────────────────

export interface Like {
  id: string;
  userId: string;
  articleId: string;
  createdAt: Date;
}

export interface CreateLikeDto {
  userId: string;
  articleId: string;
}

// ─── Follow Model ─────────────────────────────────────────────────────────────

export enum FollowTargetType {
  USER = 'user',
  CATEGORY = 'category',
}

export interface Follow {
  id: string;
  followerId: string;
  targetType: FollowTargetType;
  targetId: string;
  createdAt: Date;
}

export interface CreateFollowDto {
  followerId: string;
  targetType: FollowTargetType;
  targetId: string;
}

export interface FollowQueryFilters {
  followerId?: string;
  targetType?: FollowTargetType;
  targetId?: string;
  page?: number;
  limit?: number;
}
