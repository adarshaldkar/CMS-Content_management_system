import type {
  Article,
  ArticleQueryFilters,
  CreateArticleDto,
  PaginatedResult,
  UpdateArticleDto,
  ContentStatus,
} from '../../domain/models';

export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');

export interface IArticleRepository {
  findById(id: string): Promise<Article | null>;
  findBySlug(slug: string): Promise<Article | null>;
  findMany(filters: ArticleQueryFilters): Promise<PaginatedResult<Article>>;
  create(data: CreateArticleDto): Promise<Article>;
  update(id: string, data: UpdateArticleDto): Promise<Article>;
  softDelete(id: string): Promise<boolean>;
  updateStatus(id: string, status: ContentStatus): Promise<Article>;
}
