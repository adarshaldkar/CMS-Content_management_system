import { apiClient } from './client';
import type {
  Article,
  ArticleRevision,
  ArticleStatus,
  PaginatedResult,
  WorkflowTransitionDto,
} from '../types';

export interface ArticleFilters {
  page?: number;
  limit?: number;
  status?: ArticleStatus;
  search?: string;
  authorId?: string;
  categoryId?: string;
  categorySlug?: string;
  categorySlugs?: string | string[];
  tagSlugs?: string | string[];
  contentType?: 'article' | 'video' | 'gallery' | 'series' | 'all';
  sortBy?: 'latest' | 'trending' | 'most_read' | 'most_discussed' | 'most_liked';
  sortOrder?: 'asc' | 'desc';
  fromDate?: string;
  toDate?: string;
}

export async function listArticles(
  filters: ArticleFilters = {},
): Promise<PaginatedResult<Article>> {
  const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
    params: filters,
  });
  return data;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data } = await apiClient.get<Article | null>(`/articles/slug/${slug}`);
  return data;
}

export async function getArticleById(id: string): Promise<Article | null> {
  const { data } = await apiClient.get<Article | null>(`/articles/id/${id}`);
  return data;
}

export async function createArticle(
  payload: Partial<Article>,
): Promise<Article> {
  const { data } = await apiClient.post<Article>('/articles', payload);
  return data;
}

export async function updateArticle(
  id: string,
  payload: Partial<Article> & { expectedVersion?: number; changeSummary?: string },
): Promise<Article> {
  const { data } = await apiClient.patch<Article>(`/articles/${id}`, payload);
  return data;
}

export async function transitionArticleWorkflow(
  id: string,
  dto: WorkflowTransitionDto,
): Promise<Article> {
  const { data } = await apiClient.post<Article>(`/articles/${id}/transition`, dto);
  return data;
}

export async function getArticleRevisions(
  articleId: string,
): Promise<ArticleRevision[]> {
  const { data } = await apiClient.get<ArticleRevision[]>(
    `/articles/${articleId}/revisions`,
  );
  return data;
}

export async function restoreArticleRevision(
  articleId: string,
  revisionId: string,
): Promise<Article> {
  const { data } = await apiClient.post<Article>(
    `/articles/${articleId}/revisions/${revisionId}/restore`,
  );
  return data;
}
