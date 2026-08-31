import type { PaginationQuery } from './common.model';

export enum ContentStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  authorId: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  showAuthorName?: boolean;
  categoryId: string | null;
  categorySlug?: string | null;
  author?: { id: string; name: string; avatarUrl?: string | null };
  tagIds: string[];
  coverImage: string | null;
  status: ContentStatus;
  version: number;
  wordCount: number;
  readingTimeMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
  reviewNote: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  publishingSlotId?: string | null;
  autoDispatched?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ArticleRevision {
  id: string;
  articleId: string;
  version: number;
  title: string;
  description: string;
  content: string;
  authorId: string;
  changeSummary: string | null;
  createdAt: Date;
}

export interface CreateRevisionDto {
  articleId: string;
  version: number;
  title: string;
  description: string;
  content: string;
  authorId: string;
  changeSummary?: string | null;
}

export interface WorkflowTransitionDto {
  targetStatus: ContentStatus;
  reviewNote?: string | null;
  scheduledAt?: string | null;
  publishingSlotId?: string | null;
  changeSummary?: string | null;
  expectedVersion?: number;
}

export interface CreateArticleDto {
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  authorId: string;
  showAuthorName?: boolean;
  categoryId?: string | null;
  tagIds?: string[];
  coverImage?: string | null;
  status?: ContentStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  scheduledAt?: Date | null;
  publishingSlotId?: string | null;
  autoDispatched?: boolean;
  reviewNote?: string | null;
  wordCount?: number;
  readingTimeMinutes?: number;
}

export interface UpdateArticleDto {
  title?: string;
  slug?: string;
  description?: string;
  content?: string;
  authorId?: string;
  showAuthorName?: boolean;
  categoryId?: string | null;
  tagIds?: string[];
  coverImage?: string | null;
  status?: ContentStatus;
  version?: number;
  expectedVersion?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  publishingSlotId?: string | null;
  autoDispatched?: boolean;
  reviewNote?: string | null;
  wordCount?: number;
  readingTimeMinutes?: number;
  changeSummary?: string | null;
}

export interface ArticleQueryFilters extends PaginationQuery {
  status?: ContentStatus;
  authorId?: string;
  categoryId?: string;
  categorySlug?: string;
  categorySlugs?: string | string[];
  tagSlugs?: string | string[];
  contentType?: 'article' | 'video' | 'gallery' | 'series' | 'all';
  search?: string;
  sortBy?: 'latest' | 'trending' | 'most_read' | 'most_discussed' | 'most_liked';
  sortOrder?: 'asc' | 'desc';
  fromDate?: string;
  toDate?: string;
}
