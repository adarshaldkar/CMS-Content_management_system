import { Logger } from '@nestjs/common';
import type {
  Article,
  ArticleQueryFilters,
  CreateArticleDto,
  PaginatedResult,
  UpdateArticleDto,
  ContentStatus,
} from '../../domain/models';
import type { IArticleRepository } from '../interfaces/article.repository.interface';

/**
 * SeamlessArticleRepository
 *
 * Wraps the primary (active) article repository and secondary (peer) article repository.
 * When an article is looked up by slug or ID and not found in the active database,
 * it checks the peer database and transparently replicates the article into the active database.
 */
export class SeamlessArticleRepository implements IArticleRepository {
  private readonly logger = new Logger(SeamlessArticleRepository.name);

  constructor(
    private readonly activeRepo: IArticleRepository,
    private readonly peerRepo: IArticleRepository,
    private readonly activeDbName: string,
    private readonly peerDbName: string,
  ) {}

  async findById(id: string): Promise<Article | null> {
    const article = await this.activeRepo.findById(id);
    if (article) return article;

    try {
      const peerArticle = await this.peerRepo.findById(id);
      if (peerArticle) {
        this.logger.log(
          `[Seamless Sync] JIT replicating article "${peerArticle.title}" from ${this.peerDbName} to ${this.activeDbName} by ID`,
        );
        return await this.activeRepo.create({
          title: peerArticle.title,
          slug: peerArticle.slug,
          description: peerArticle.description,
          content: peerArticle.content,
          authorId: peerArticle.authorId,
          categoryId: peerArticle.categoryId,
          tagIds: peerArticle.tagIds,
          coverImage: peerArticle.coverImage,
          status: peerArticle.status,
          seoTitle: peerArticle.seoTitle,
          seoDescription: peerArticle.seoDescription,
          scheduledAt: peerArticle.scheduledAt,
          reviewNote: peerArticle.reviewNote,
          wordCount: peerArticle.wordCount,
          readingTimeMinutes: peerArticle.readingTimeMinutes,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer DB lookup by ID failed: ${err.message}`);
    }

    return null;
  }

  async findBySlug(slug: string): Promise<Article | null> {
    const article = await this.activeRepo.findBySlug(slug);
    if (article) return article;

    try {
      const peerArticle = await this.peerRepo.findBySlug(slug);
      if (peerArticle) {
        this.logger.log(
          `[Seamless Sync] JIT replicating article "${peerArticle.title}" from ${this.peerDbName} to ${this.activeDbName} by Slug`,
        );
        return await this.activeRepo.create({
          title: peerArticle.title,
          slug: peerArticle.slug,
          description: peerArticle.description,
          content: peerArticle.content,
          authorId: peerArticle.authorId,
          categoryId: peerArticle.categoryId,
          tagIds: peerArticle.tagIds,
          coverImage: peerArticle.coverImage,
          status: peerArticle.status,
          seoTitle: peerArticle.seoTitle,
          seoDescription: peerArticle.seoDescription,
          scheduledAt: peerArticle.scheduledAt,
          reviewNote: peerArticle.reviewNote,
          wordCount: peerArticle.wordCount,
          readingTimeMinutes: peerArticle.readingTimeMinutes,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer DB lookup by Slug failed: ${err.message}`);
    }

    return null;
  }

  async findMany(filters: ArticleQueryFilters): Promise<PaginatedResult<Article>> {
    return this.activeRepo.findMany(filters);
  }

  async create(data: CreateArticleDto): Promise<Article> {
    return this.activeRepo.create(data);
  }

  async update(id: string, data: UpdateArticleDto): Promise<Article> {
    return this.activeRepo.update(id, data);
  }

  async softDelete(id: string): Promise<boolean> {
    return this.activeRepo.softDelete(id);
  }

  async updateStatus(id: string, status: ContentStatus): Promise<Article> {
    return this.activeRepo.updateStatus(id, status);
  }
}
