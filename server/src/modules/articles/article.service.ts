import { Inject, Injectable } from '@nestjs/common';
import type {
  ArticleQueryFilters,
  PaginatedResult,
  Article,
} from '../../domain/models';
import {
  ARTICLE_REPOSITORY,
  type IArticleRepository,
} from '../../repositories/interfaces/article.repository.interface';

@Injectable()
export class ArticleService {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepository: IArticleRepository,
  ) {}

  findMany(filters: ArticleQueryFilters): Promise<PaginatedResult<Article>> {
    return this.articleRepository.findMany(filters);
  }

  findBySlug(slug: string): Promise<Article | null> {
    return this.articleRepository.findBySlug(slug);
  }

  findById(id: string): Promise<Article | null> {
    return this.articleRepository.findById(id);
  }
}
