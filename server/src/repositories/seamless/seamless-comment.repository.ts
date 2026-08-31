import { Logger } from '@nestjs/common';
import type {
  Comment,
  CommentQueryFilters,
  CreateCommentDto,
  UpdateCommentDto,
} from '../../domain/models';
import type { ICommentRepository } from '../interfaces/comment.repository.interface';
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

type CommentInput = CreateCommentDto & {
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
};

export class SeamlessCommentRepository implements ICommentRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessCommentRepository.name);

  constructor(
    private readonly primaryRepo: ICommentRepository,
    private readonly secondaryRepo: ICommentRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadb?: MariaDbService,
    private readonly mysql?: MySqlService,
    private readonly cockroach?: CockroachDbService,
    private readonly mariadbRepo?: ICommentRepository,
    private readonly mysqlRepo?: ICommentRepository,
    private readonly cockroachRepo?: ICommentRepository,
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

  private get postgresStore(): ICommentRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): ICommentRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): ICommentRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): ICommentRepository[] {
    const targets: ICommentRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): ICommentRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  private async replicateToAll(comment: Comment): Promise<void> {
    const tasks: Promise<any>[] = [];
    const sqlStatus = comment.status.toUpperCase();

    // 1. Other main store(s) — Postgres and/or Mongo depending on active engine
    for (const store of this.peerStores) {
      tasks.push(
        store
          .create({
            articleId: comment.articleId,
            parentId: comment.parentId ?? null,
            body: comment.body,
            authorId: comment.authorId,
            authorName: comment.authorName,
            authorAvatar: comment.authorAvatar,
          })
          .catch((e) => this.logger.debug(`Peer comment sync note: ${e.message}`)),
      );
    }

    // 2. MariaDB
    if (this.mariadb) {
      tasks.push(
        this.mariadb.pool
          .query(
            `INSERT INTO comments (id, article_id, parent_id, author_id, author_name, author_avatar, body, status, moderation_note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE body=VALUES(body), status=VALUES(status), moderation_note=VALUES(moderation_note);`,
            [
              comment.id,
              comment.articleId,
              comment.parentId || null,
              comment.authorId,
              comment.authorName,
              comment.authorAvatar,
              comment.body,
              sqlStatus,
              comment.moderationNote || null,
            ],
          )
          .catch((e: any) => this.logger.warn(`MariaDB comment sync failed: ${e.message}`)),
      );
    }

    // 3. MySQL
    if (this.mysql) {
      tasks.push(
        this.mysql.pool
          .query(
            `INSERT INTO comments (id, article_id, parent_id, author_id, author_name, author_avatar, body, status, moderation_note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE body=VALUES(body), status=VALUES(status), moderation_note=VALUES(moderation_note);`,
            [
              comment.id,
              comment.articleId,
              comment.parentId || null,
              comment.authorId,
              comment.authorName,
              comment.authorAvatar,
              comment.body,
              sqlStatus,
              comment.moderationNote || null,
            ],
          )
          .catch((e: any) => this.logger.warn(`MySQL comment sync failed: ${e.message}`)),
      );
    }

    // 4. CockroachDB
    if (this.cockroach) {
      tasks.push(
        this.cockroach.pool
          .query(
            `INSERT INTO comments (id, article_id, parent_id, author_id, author_name, author_avatar, body, status, moderation_note, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET body=EXCLUDED.body, status=EXCLUDED.status, moderation_note=EXCLUDED.moderation_note, updated_at=now();`,
            [
              comment.id,
              comment.articleId,
              comment.parentId || null,
              comment.authorId,
              comment.authorName,
              comment.authorAvatar,
              comment.body,
              sqlStatus,
              comment.moderationNote || null,
              comment.createdAt,
              comment.updatedAt,
            ],
          )
          .catch((e: any) => this.logger.warn(`CockroachDB comment sync failed: ${e.message}`)),
      );
    }

    await Promise.allSettled(tasks);
  }

  async findById(id: string): Promise<Comment | null> {
    const comment = await this.activeRepo.findById(id);
    if (comment) return comment;

    try {
      const peerComment = await this.jitReadPeer.findById(id);
      if (peerComment) {
        this.logger.log(`[Seamless Sync] JIT replicating comment by ID`);
        const replicated = await this.activeRepo.create({
          articleId: peerComment.articleId,
          parentId: peerComment.parentId ?? null,
          body: peerComment.body,
          authorId: peerComment.authorId,
          authorName: peerComment.authorName,
          authorAvatar: peerComment.authorAvatar,
        });
        this.replicateToAll(replicated).catch(() => {});
        return replicated;
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer DB lookup by ID failed: ${err.message}`);
    }

    return null;
  }

  async findMany(filters: CommentQueryFilters): Promise<Comment[]> {
    return this.activeRepo.findMany(filters);
  }

  async create(dto: CommentInput): Promise<Comment> {
    const comment = await this.activeRepo.create(dto);
    this.replicateToAll(comment).catch((e) =>
      this.logger.warn(`Multi-DB Comment create sync failed: ${e.message}`),
    );
    return comment;
  }

  async update(id: string, dto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.activeRepo.update(id, dto);
    this.replicateToAll(comment).catch((e) =>
      this.logger.warn(`Multi-DB Comment update sync failed: ${e.message}`),
    );
    return comment;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.activeRepo.softDelete(id);
    for (const store of this.peerStores) {
      store.softDelete(id).catch(() => {});
    }
    return result;
  }

  async countByArticle(articleId: string): Promise<number> {
    return this.activeRepo.countByArticle(articleId);
  }
}