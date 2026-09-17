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
import type { SupportedDbName } from '../repository-proxy';
import type { IRuntimeSwitchableRepository } from '../repository-proxy';
import type { MariaDbService } from '../../database/mariadb.service';
import type { MySqlService } from '../../database/mysql.service';
import type { CockroachDbService } from '../../database/cockroach.service';
import type { ClickHouseService } from '../../database/clickhouse.service';
import {
  activeEngine,
  mongoStoreOf,
  postgresStoreOf,
  selectActiveReadRepo,
  shouldReplicateToMongo,
  shouldReplicateToPostgres,
} from './db-router.util';

export class SeamlessArticleRepository implements IArticleRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessArticleRepository.name);

  constructor(
    private readonly primaryRepo: IArticleRepository,
    private readonly secondaryRepo: IArticleRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadb?: MariaDbService,
    private readonly mysql?: MySqlService,
    private readonly cockroach?: CockroachDbService,
    private readonly clickhouse?: ClickHouseService,
    private readonly mariadbRepo?: IArticleRepository,
    private readonly mysqlRepo?: IArticleRepository,
    private readonly cockroachRepo?: IArticleRepository,
  ) {}

  __switchActive(target: SupportedDbName): void {
    process.env.ACTIVE_DATABASE = target;
  }

  __activeDb(): SupportedDbName {
    return activeEngine();
  }

  public get activeDbName(): string {
    return this.primaryName;
  }

  public get peerDbName(): string {
    return this.secondaryName;
  }

  private get postgresStore(): IArticleRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): IArticleRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): IArticleRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): IArticleRepository[] {
    const targets: IArticleRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): IArticleRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  private async replicateToAll(article: Article): Promise<void> {
    const tasks: Promise<any>[] = [];

    // 1. Other main store(s) — Postgres and/or Mongo depending on active engine
    for (const store of this.peerStores) {
      tasks.push(
        (store as any).create({
          id: article.id,
          _id: article.id,
          title: article.title,
          slug: article.slug,
          description: article.description,
          content: article.content,
          authorId: article.authorId,
          categoryId: article.categoryId,
          tagIds: article.tagIds || [],
          coverImage: article.coverImage,
          status: article.status,
          wordCount: article.wordCount,
          readingTimeMinutes: article.readingTimeMinutes,
          seoTitle: article.seoTitle,
          seoDescription: article.seoDescription,
          reviewNote: article.reviewNote,
          scheduledAt: article.scheduledAt,
        }).catch((e: any) => this.logger.debug(`Peer article sync note: ${e.message}`)),
      );
    }

    await this.replicateRawEngines(article);
  }

  /**
   * Upsert-semantics replication for an updated article. Applies the mutation to
   * the peer store's `update` (mutating an existing document) rather than the
   * `create`-based `replicateToAll`, which would throw on duplicate keys.
   */
  private async replicateUpdateToAll(article: Article, data: UpdateArticleDto): Promise<void> {
    const tasks: Promise<any>[] = [];

    for (const store of this.peerStores) {
      tasks.push(
        store.update(article.id, data).catch((e) => this.logger.debug(`Peer article update sync note: ${e.message}`)),
      );
    }

    await this.replicateRawEngines(article);
  }

  private async replicateRawEngines(article: Article): Promise<void> {
    const tasks: Promise<any>[] = [];

    // MariaDB
    if (this.mariadb) {
      tasks.push(
        this.mariadb.pool.query(
          `INSERT INTO articles (id, title, slug, description, content, author_id, category_id, cover_image, status, version, word_count, reading_time_minutes, seo_title, seo_description, review_note, tag_ids, scheduled_at, published_at, publishing_slot_id, auto_dispatched)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), description=VALUES(description), status=VALUES(status), version=VALUES(version), word_count=VALUES(word_count), reading_time_minutes=VALUES(reading_time_minutes), cover_image=VALUES(cover_image), category_id=VALUES(category_id), scheduled_at=VALUES(scheduled_at), published_at=VALUES(published_at), publishing_slot_id=VALUES(publishing_slot_id), auto_dispatched=VALUES(auto_dispatched);`,
          [
            article.id,
            article.title,
            article.slug,
            article.description || null,
            article.content || null,
            article.authorId,
            article.categoryId || null,
            article.coverImage || null,
            article.status,
            article.version || 1,
            article.wordCount || 0,
            article.readingTimeMinutes || 1,
            article.seoTitle || null,
            article.seoDescription || null,
            article.reviewNote || null,
            JSON.stringify(article.tagIds || []),
            article.scheduledAt ? new Date(article.scheduledAt) : null,
            article.publishedAt ? new Date(article.publishedAt) : null,
            article.publishingSlotId || null,
            article.autoDispatched ? 1 : 0,
          ],
        ).catch((e: any) => this.logger.warn(`MariaDB article sync failed: ${e.message}`)),
      );
    }

    // MySQL
    if (this.mysql) {
      tasks.push(
        this.mysql.pool.query(
          `INSERT INTO articles (id, title, slug, description, content, author_id, category_id, cover_image, status, version, word_count, reading_time_minutes, seo_title, seo_description, review_note, tag_ids, scheduled_at, published_at, publishing_slot_id, auto_dispatched)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), description=VALUES(description), status=VALUES(status), version=VALUES(version), word_count=VALUES(word_count), reading_time_minutes=VALUES(reading_time_minutes), cover_image=VALUES(cover_image), category_id=VALUES(category_id), scheduled_at=VALUES(scheduled_at), published_at=VALUES(published_at), publishing_slot_id=VALUES(publishing_slot_id), auto_dispatched=VALUES(auto_dispatched);`,
          [
            article.id,
            article.title,
            article.slug,
            article.description || null,
            article.content || null,
            article.authorId,
            article.categoryId || null,
            article.coverImage || null,
            article.status,
            article.version || 1,
            article.wordCount || 0,
            article.readingTimeMinutes || 1,
            article.seoTitle || null,
            article.seoDescription || null,
            article.reviewNote || null,
            JSON.stringify(article.tagIds || []),
            article.scheduledAt ? new Date(article.scheduledAt) : null,
            article.publishedAt ? new Date(article.publishedAt) : null,
            article.publishingSlotId || null,
            article.autoDispatched ? 1 : 0,
          ],
        ).catch((e: any) => this.logger.warn(`MySQL article sync failed: ${e.message}`)),
      );
    }

    // CockroachDB
    if (this.cockroach) {
      tasks.push(
        this.cockroach.pool.query(
          `INSERT INTO articles (id, title, slug, description, content, author_id, category_id, cover_image, status, version, word_count, reading_time_minutes, seo_title, seo_description, review_note, tag_ids, scheduled_at, published_at, publishing_slot_id, auto_dispatched)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
           ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content, description=EXCLUDED.description, status=EXCLUDED.status, version=EXCLUDED.version, word_count=EXCLUDED.word_count, reading_time_minutes=EXCLUDED.reading_time_minutes, cover_image=EXCLUDED.cover_image, category_id=EXCLUDED.category_id, scheduled_at=EXCLUDED.scheduled_at, published_at=EXCLUDED.published_at, publishing_slot_id=EXCLUDED.publishing_slot_id, auto_dispatched=EXCLUDED.auto_dispatched, updated_at=now();`,
          [
            article.id,
            article.title,
            article.slug,
            article.description || null,
            article.content || null,
            article.authorId,
            article.categoryId || null,
            article.coverImage || null,
            article.status,
            article.version || 1,
            article.wordCount || 0,
            article.readingTimeMinutes || 1,
            article.seoTitle || null,
            article.seoDescription || null,
            article.reviewNote || null,
            JSON.stringify(article.tagIds || []),
            article.scheduledAt ? new Date(article.scheduledAt) : null,
            article.publishedAt ? new Date(article.publishedAt) : null,
            article.publishingSlotId || null,
            article.autoDispatched || false,
          ],
        ).catch((e: any) => this.logger.warn(`CockroachDB article sync failed: ${e.message}`)),
      );
    }

    // ClickHouse
    if (this.clickhouse) {
      tasks.push(
        this.clickhouse.client.insert({
          table: 'cms_platform.article_snapshots',
          values: [
            {
              id: String(article.id),
              title: article.title,
              slug: article.slug,
              description: article.description || '',
              author_id: String(article.authorId),
              category_id: String(article.categoryId || ''),
              status: article.status,
              version: article.version || 1,
              word_count: article.wordCount || 0,
              reading_time_minutes: article.readingTimeMinutes || 1,
            },
          ],
          format: 'JSONEachRow',
        }).catch((e: any) => this.logger.warn(`ClickHouse article sync failed: ${e.message}`)),
      );
    }

    await Promise.allSettled(tasks);
  }

  async findById(id: string): Promise<Article | null> {
    const article = await this.activeRepo.findById(id);
    if (article) return article;

    try {
      const peerArticle = await this.jitReadPeer.findById(id);
      if (peerArticle) {
        this.logger.log(`[Seamless Sync] JIT replicating article "${peerArticle.title}" by ID`);
        const replicated = await this.activeRepo.create({
          title: peerArticle.title,
          slug: peerArticle.slug,
          description: peerArticle.description,
          content: peerArticle.content,
          authorId: peerArticle.authorId,
          categoryId: peerArticle.categoryId,
          tagIds: peerArticle.tagIds || [],
          coverImage: peerArticle.coverImage,
          status: peerArticle.status,
          wordCount: peerArticle.wordCount,
          readingTimeMinutes: peerArticle.readingTimeMinutes,
          seoTitle: peerArticle.seoTitle,
          seoDescription: peerArticle.seoDescription,
          reviewNote: peerArticle.reviewNote,
          scheduledAt: peerArticle.scheduledAt,
        });
        this.replicateToAll(replicated).catch(() => {});
        return replicated;
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
      const peerArticle = await this.jitReadPeer.findBySlug(slug);
      if (peerArticle) {
        this.logger.log(`[Seamless Sync] JIT replicating article "${peerArticle.title}" by slug`);
        const replicated = await this.activeRepo.create({
          title: peerArticle.title,
          slug: peerArticle.slug,
          description: peerArticle.description,
          content: peerArticle.content,
          authorId: peerArticle.authorId,
          categoryId: peerArticle.categoryId,
          tagIds: peerArticle.tagIds || [],
          coverImage: peerArticle.coverImage,
          status: peerArticle.status,
          wordCount: peerArticle.wordCount,
          readingTimeMinutes: peerArticle.readingTimeMinutes,
          seoTitle: peerArticle.seoTitle,
          seoDescription: peerArticle.seoDescription,
          reviewNote: peerArticle.reviewNote,
          scheduledAt: peerArticle.scheduledAt,
        });
        this.replicateToAll(replicated).catch(() => {});
        return replicated;
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
    const article = await this.activeRepo.create(data);
    this.replicateToAll(article).catch((e) => this.logger.warn(`Multi-DB Article create sync failed: ${e.message}`));
    return article;
  }

  async update(id: string, data: UpdateArticleDto): Promise<Article> {
    const article = await this.activeRepo.update(id, data);
    this.replicateUpdateToAll(article, data).catch((e) => this.logger.warn(`Multi-DB Article update sync failed: ${e.message}`));
    return article;
  }

  async updateStatus(id: string, status: ContentStatus, note?: string): Promise<Article> {
    const article = await this.activeRepo.updateStatus(id, status);
    if (note) {
      await this.activeRepo.update(id, { reviewNote: note }).catch(() => {});
    }
    this.replicateUpdateToAll(article, { status }).catch((e) => this.logger.warn(`Multi-DB Article status sync failed: ${e.message}`));
    return article;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.activeRepo.softDelete(id);
    return result;
  }
}
