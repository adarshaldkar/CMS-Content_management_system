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

export class SeamlessArticleRepository implements IArticleRepository {
  private readonly logger = new Logger(SeamlessArticleRepository.name);

  constructor(
    private readonly primaryRepo: IArticleRepository,
    private readonly secondaryRepo: IArticleRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
  ) {}

  public get activeDbName(): string {
    return this.primaryName;
  }

  public get peerDbName(): string {
    return this.secondaryName;
  }

  private get activeRepo(): IArticleRepository {
    const active = process.env.ACTIVE_DATABASE || this.primaryName;
    if (active === 'mongodb') {
      return this.primaryName === 'mongodb' ? this.primaryRepo : this.secondaryRepo;
    }
    return this.primaryName === 'postgres' ? this.primaryRepo : this.secondaryRepo;
  }

  private get peerRepo(): IArticleRepository {
    const active = process.env.ACTIVE_DATABASE || this.primaryName;
    if (active === 'mongodb') {
      return this.primaryName === 'mongodb' ? this.secondaryRepo : this.primaryRepo;
    }
    return this.primaryName === 'postgres' ? this.secondaryRepo : this.primaryRepo;
  }

  async findById(id: string): Promise<Article | null> {
    const article = await this.activeRepo.findById(id);
    if (article) return article;

    try {
      const peerArticle = await this.peerRepo.findById(id);
      if (peerArticle) {
        this.logger.log(
          `[Seamless Sync] JIT replicating article "${peerArticle.title}" by ID`,
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
          `[Seamless Sync] JIT replicating article "${peerArticle.title}" by Slug`,
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
    const result = await this.activeRepo.findMany(filters);
    if (result.items.length > 0 || result.total > 0) {
      return result;
    }

    try {
      const peerResult = await this.peerRepo.findMany(filters);
      if (peerResult.items.length > 0) {
        this.logger.log(
          `[Seamless Sync] JIT replicating ${peerResult.items.length} articles from peer repository for query`,
        );
        for (const peerArticle of peerResult.items) {
          try {
            await this.activeRepo.create({
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
          } catch {
            // Safe ignore duplicates
          }
        }
        return peerResult;
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer findMany fallback failed: ${err.message}`);
    }

    return result;
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
