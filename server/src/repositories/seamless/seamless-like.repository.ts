import { Logger } from '@nestjs/common';
import type { CreateLikeDto, Like } from '../../domain/models';
import type { ILikeRepository } from '../interfaces/like.repository.interface';
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

export class SeamlessLikeRepository implements ILikeRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessLikeRepository.name);

  constructor(
    private readonly primaryRepo: ILikeRepository,
    private readonly secondaryRepo: ILikeRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadb?: MariaDbService,
    private readonly mysql?: MySqlService,
    private readonly cockroach?: CockroachDbService,
    private readonly mariadbRepo?: ILikeRepository,
    private readonly mysqlRepo?: ILikeRepository,
    private readonly cockroachRepo?: ILikeRepository,
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

  private get postgresStore(): ILikeRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): ILikeRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): ILikeRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): ILikeRepository[] {
    const targets: ILikeRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): ILikeRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  private async replicateToAll(like: Like): Promise<void> {
    const tasks: Promise<any>[] = [];

    // 1. Other main store(s) — Postgres and/or Mongo depending on active engine
    for (const store of this.peerStores) {
      tasks.push(
        store
          .create({ userId: like.userId, articleId: like.articleId })
          .catch((e) => this.logger.debug(`Peer like sync note: ${e.message}`)),
      );
    }

    // 2. MariaDB
    if (this.mariadb) {
      tasks.push(
        this.mariadb.pool
          .query(
            `INSERT INTO likes (id, user_id, article_id)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE article_id=VALUES(article_id);`,
            [like.id, like.userId, like.articleId],
          )
          .catch((e: any) => this.logger.warn(`MariaDB like sync failed: ${e.message}`)),
      );
    }

    // 3. MySQL
    if (this.mysql) {
      tasks.push(
        this.mysql.pool
          .query(
            `INSERT INTO likes (id, user_id, article_id)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE article_id=VALUES(article_id);`,
            [like.id, like.userId, like.articleId],
          )
          .catch((e: any) => this.logger.warn(`MySQL like sync failed: ${e.message}`)),
      );
    }

    // 4. CockroachDB
    if (this.cockroach) {
      tasks.push(
        this.cockroach.pool
          .query(
            `INSERT INTO likes (id, user_id, article_id, created_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, article_id) DO UPDATE SET article_id=EXCLUDED.article_id;`,
            [like.id, like.userId, like.articleId, like.createdAt],
          )
          .catch((e: any) => this.logger.warn(`CockroachDB like sync failed: ${e.message}`)),
      );
    }

    await Promise.allSettled(tasks);
  }

  async findOne(userId: string, articleId: string): Promise<Like | null> {
    return this.activeRepo.findOne(userId, articleId);
  }

  async create(dto: CreateLikeDto): Promise<Like> {
    const like = await this.activeRepo.create(dto);
    this.replicateToAll(like).catch((e) =>
      this.logger.warn(`Multi-DB Like create sync failed: ${e.message}`),
    );
    return like;
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