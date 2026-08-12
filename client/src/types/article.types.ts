export type ArticleStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived'
  | 'rejected';

export interface Article {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string | null;
  categoryId: string | null;
  categoryName?: string;
  categorySlug?: string;
  tagIds: string[];
  coverImage: string | null;
  status: ArticleStatus;
  version: number;
  wordCount: number;
  readingTimeMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
  reviewNote: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
}

export interface WorkflowTransitionDto {
  targetStatus: ArticleStatus;
  reviewNote?: string | null;
  scheduledAt?: string | null;
  changeSummary?: string | null;
  expectedVersion?: number;
}
