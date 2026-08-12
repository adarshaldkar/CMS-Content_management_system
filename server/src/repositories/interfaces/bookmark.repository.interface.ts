import type { Bookmark, CreateBookmarkDto } from '../../domain/models';
import type { PaginatedResult } from '../../domain/models';

export const BOOKMARK_REPOSITORY = 'BOOKMARK_REPOSITORY';

export interface IBookmarkRepository {
  findByUser(userId: string, page: number, limit: number): Promise<PaginatedResult<Bookmark>>;
  findOne(userId: string, articleId: string): Promise<Bookmark | null>;
  create(dto: CreateBookmarkDto): Promise<Bookmark>;
  delete(userId: string, articleId: string): Promise<boolean>;
  countByArticle(articleId: string): Promise<number>;
}
