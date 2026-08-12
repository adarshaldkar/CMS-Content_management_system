import type { ArticleRevision, CreateRevisionDto } from '../../domain/models';

export const REVISION_REPOSITORY = Symbol('REVISION_REPOSITORY');

export interface IRevisionRepository {
  create(data: CreateRevisionDto): Promise<ArticleRevision>;
  findByArticleId(articleId: string): Promise<ArticleRevision[]>;
  findById(id: string): Promise<ArticleRevision | null>;
}
