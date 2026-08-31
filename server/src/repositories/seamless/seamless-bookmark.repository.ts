import { Logger } from '@nestjs/common';
import type {
  Bookmark,
  CreateBookmarkDto,
  PaginatedResult,
} from '../../domain/models';
import type { IBookmarkRepository } from '../interfaces/bookmark.repository.interface';
import type { SupportedDbName, IRuntimeSwitchableRepository } from '../repository-proxy';
import type { MariaDbService } from '../../database/mariadb.service';
import type { MySqlService } from '../../database/mysql.service';
import type { CockroachDbService } from '../../database/cockroach.service';
import {
  activeEngine,
  mongoStoreOf,
  postgresStoreOf,
  selectActiveReadRepo,
  shouldReplicateToMongo,
  shouldReplicateToPostgres,
} from './db-router.util';

export class SeamlessBookmarkRepository implements IBookmarkRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessBookmarkRepository.name);

  constructor(
    private readonly primaryRepo: IBookmarkRepository,
    private readonly secondaryRepo: IBookmarkRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadb?: MariaDbService,
    private readonly mysql?: MySqlService,
    private readonly cockroach?: CockroachDbService,
    private readonly mariadbRepo?: IBookmarkRepository,
    private readonly mysqlRepo?: IBookmarkRepository,
    private readonly cockroachRepo?: IBookmarkRepository,
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

  private get postgresStore(): IBookmarkRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): IBookmarkRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): IBookmarkRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): IBookmarkRepository[] {
    const targets: IBookmarkRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): IBookmarkRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  private async replicateToAll(bookmark: Bookmark): Promise<void> {
    const tasks: Promise<any>[] = [];

    // 1. Other main store(s) — Postgres and/or Mongo depending on active engine
    for (const store of this.peerStores) {
      tasks.push(
        store
          .create({ userId: bookmark.userId, articleId: bookmark.articleId })
          .catch((e) => this.logger.debug(`Peer bookmark sync note: ${e.message}`)),
      );
    }

    // 2. MariaDB
    if (this.mariadb) {
      tasks.push(
        this.mariadb.pool
          .query(
            `INSERT INTO bookmarks (id, user_id, article_id)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE article_id=VALUES(article_id);`,
            [bookmark.id, bookmark.userId, bookmark.articleId],
          )
          .catch((e: any) => this.logger.warn(`MariaDB bookmark sync failed: ${e.message}`)),
      );
    }

    // 3. MySQL
    if (this.mysql) {
      tasks.push(
        this.mysql.pool
          .query(
            `INSERT INTO bookmarks (id, user_id, article_id)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE article_id=VALUES(article_id);`,
            [bookmark.id, bookmark.userId, bookmark.articleId],
          )
          .catch((e: any) => this.logger.warn(`MySQL bookmark sync failed: ${e.message}`)),
      );
    }

    // 4. CockroachDB
    if (this.cockroach) {
      tasks.push(
        this.cockroach.pool
          .query(
            `INSERT INTO bookmarks (id, user_id, article_id, created_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, article_id) DO UPDATE SET article_id=EXCLUDED.article_id;`,
            [bookmark.id, bookmark.userId, bookmark.articleId, bookmark.createdAt],
          )
          .catch((e: any) => this.logger.warn(`CockroachDB bookmark sync failed: ${e.message}`)),
      );
    }

    await Promise.allSettled(tasks);
  }

  async findByUser(userId: string, page: number, limit: number): Promise<PaginatedResult<Bookmark>> {
    return this.activeRepo.findByUser(userId, page, limit);
  }

  async findOne(userId: string, articleId: string): Promise<Bookmark | null> {
    return this.activeRepo.findOne(userId, articleId);
  }

  async create(dto: CreateBookmarkDto): Promise<Bookmark> {
    const bookmark = await this.activeRepo.create(dto);
    this.replicateToAll(bookmark).catch((e) =>
      this.logger.warn(`Multi-DB Bookmark create sync failed: ${e.message}`),
    );
    return bookmark;
  }

  async delete(userId: string, articleId: string): Promise<boolean> {
    const result = await this.activeRepo.delete(userId, articleId);
    for (const store of this.peerStores) {
      store.delete(userId, articleId).catch(() => {});
    }
    return result;
  }

  async countByArticle(articleId: string): Promise<number> {
    return this.activeRepo.countByArticle(articleId);
  }
}