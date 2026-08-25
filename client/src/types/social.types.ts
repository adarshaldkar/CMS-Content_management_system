import type { Article } from './article.types';

export interface Comment {
  id: string;
  articleId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  body: string;
  content?: string; // Alias for body — kept for backward compatibility
  status: 'pending' | 'approved' | 'hidden' | 'flagged';
  isHidden: boolean;
  flagCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  articleId: string;
  article?: Article;
  createdAt: string;
}

export interface FollowRelation {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}
