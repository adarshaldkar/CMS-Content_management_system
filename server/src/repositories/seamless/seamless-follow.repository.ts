import { Logger } from '@nestjs/common';
import type {
  CreateFollowDto,
  Follow,
  FollowQueryFilters,
  PaginatedResult,
} from '../../domain/models';
import { FollowTargetType } from '../../domain/models';
import type { IFollowRepository } from '../interfaces/follow.repository.interface';
import type { MariaDbService } from '../../database/mariadb.service';
import type { MySqlService } from '../../database/mysql.service';
import type { CockroachDbService } from '../../database/cockroach.service';
import type { SupportedDbName, IRuntimeSwitchableRepository } from '../repository-proxy';
import {
  activeEngine,
  mongoStoreOf,
  postgresStoreOf,
  selectActiveReadRepo,
  shouldReplicateToMongo,
  shouldReplicateToPostgres,
} from './db-router.util';

export class SeamlessFollowRepository implements IFollowRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessFollowRepository.name);

  constructor(
    private readonly primaryRepo: IFollowRepository,
    private readonly secondaryRepo: IFollowRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadb?: MariaDbService,
    private readonly mysql?: MySqlService,
    private readonly cockroach?: CockroachDbService,
    private readonly mariadbRepo?: IFollowRepository,
    private readonly mysqlRepo?: IFollowRepository,
    private readonly cockroachRepo?: IFollowRepository,
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

  private get postgresStore(): IFollowRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): IFollowRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): IFollowRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): IFollowRepository[] {
    const targets: IFollowRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): IFollowRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  private async replicateToAll(follow: Follow): Promise<void> {
    const tasks: Promise<any>[] = [];

    // 1. Other main store(s) — Postgres and/or Mongo depending on active engine
    for (const store of this.peerStores) {
      tasks.push(
        store
          .create({
            followerId: follow.followerId,
            targetType: follow.targetType,
            targetId: follow.targetId,
          })
          .catch((e) => this.logger.debug(`Peer follow sync note: ${e.message}`)),
      );
    }

    // 2. MariaDB
    if (this.mariadb) {
      tasks.push(
        this.mariadb.pool
          .query(
            `INSERT INTO follows (id, follower_id, target_type, target_id)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE target_type=VALUES(target_type), target_id=VALUES(target_id);`,
            [
              follow.id,
              follow.followerId,
              follow.targetType,
              follow.targetId,
            ],
          )
          .catch((e: any) => this.logger.warn(`MariaDB follow sync failed: ${e.message}`)),
      );
    }

    // 3. MySQL
    if (this.mysql) {
      tasks.push(
        this.mysql.pool
          .query(
            `INSERT INTO follows (id, follower_id, target_type, target_id)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE target_type=VALUES(target_type), target_id=VALUES(target_id);`,
            [
              follow.id,
              follow.followerId,
              follow.targetType,
              follow.targetId,
            ],
          )
          .catch((e: any) => this.logger.warn(`MySQL follow sync failed: ${e.message}`)),
      );
    }

    // 4. CockroachDB
    if (this.cockroach) {
      tasks.push(
        this.cockroach.pool
          .query(
            `INSERT INTO follows (id, follower_id, target_type, target_id, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (follower_id, target_type, target_id) DO UPDATE SET target_type=EXCLUDED.target_type, target_id=EXCLUDED.target_id;`,
            [
              follow.id,
              follow.followerId,
              follow.targetType,
              follow.targetId,
              follow.createdAt,
            ],
          )
          .catch((e: any) => this.logger.warn(`CockroachDB follow sync failed: ${e.message}`)),
      );
    }

    await Promise.allSettled(tasks);
  }

  async findOne(
    followerId: string,
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<Follow | null> {
    return this.activeRepo.findOne(followerId, targetType, targetId);
  }

  async findMany(filters: FollowQueryFilters): Promise<PaginatedResult<Follow>> {
    return this.activeRepo.findMany(filters);
  }

  async create(dto: CreateFollowDto): Promise<Follow> {
    const follow = await this.activeRepo.create(dto);
    this.replicateToAll(follow).catch((e) =>
      this.logger.warn(`Multi-DB Follow create sync failed: ${e.message}`),
    );
    return follow;
  }

  async delete(
    followerId: string,
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<boolean> {
    const result = await this.activeRepo.delete(followerId, targetType, targetId);
    for (const store of this.peerStores) {
      store.delete(followerId, targetType, targetId).catch(() => {});
    }
    return result;
  }

  async countFollowers(targetType: FollowTargetType, targetId: string): Promise<number> {
    return this.activeRepo.countFollowers(targetType, targetId);
  }

  async countFollowing(followerId: string, targetType: FollowTargetType): Promise<number> {
    return this.activeRepo.countFollowing(followerId, targetType);
  }
}