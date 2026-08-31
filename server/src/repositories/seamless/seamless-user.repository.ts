import { Logger } from '@nestjs/common';
import type {
  CreateUserDto,
  PaginatedResult,
  UpdateUserDto,
  User,
  UserQueryFilters,
} from '../../domain/models';
import type { IUserRepository } from '../interfaces/user.repository.interface';
import type { SupportedDbName, IRuntimeSwitchableRepository } from '../repository-proxy';
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

export class SeamlessUserRepository implements IUserRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessUserRepository.name);

  constructor(
    private readonly primaryRepo: IUserRepository,
    private readonly secondaryRepo: IUserRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadb?: MariaDbService,
    private readonly mysql?: MySqlService,
    private readonly cockroach?: CockroachDbService,
    private readonly clickhouse?: ClickHouseService,
    private readonly mariadbRepo?: IUserRepository,
    private readonly mysqlRepo?: IUserRepository,
    private readonly cockroachRepo?: IUserRepository,
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

  private get postgresStore(): IUserRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): IUserRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): IUserRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): IUserRepository[] {
    const targets: IUserRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): IUserRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  private async replicateToAll(user: User): Promise<void> {
    const tasks: Promise<any>[] = [];

    // 1. Other main store(s) — Postgres and/or Mongo depending on active engine
    for (const store of this.peerStores) {
      tasks.push(
        store.create({
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash || '',
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          preferredTopics: user.preferredTopics || [],
          role: user.role,
          isActive: user.isActive,
        }).catch((e) => this.logger.debug(`Peer user sync note: ${e.message}`)),
      );
    }

    // 1b. Raw SQL engines + analytics (upsert semantics for existing rows)
    await this.replicateRawEngines(user);
  }

  /**
   * Upsert-semantics replication for an updated user. Unlike `replicateToAll`
   * (which inserts via the peer store's `create` — failing on duplicate keys for
   * an already-existing user), updates propagate through the peer store's
   * `update` call so an existing document is actually mutated.
   */
  private async replicateUpdateToAll(id: string, data: UpdateUserDto): Promise<void> {
    const tasks: Promise<any>[] = [];

    for (const store of this.peerStores) {
      tasks.push(
        store.update(id, data).catch((e) => this.logger.debug(`Peer user update sync note: ${e.message}`)),
      );
    }

    await this.replicateRawEngines(data as User);
  }

  private async replicateRawEngines(user: User): Promise<void> {
    const tasks: Promise<any>[] = [];

    // MariaDB
    if (this.mariadb) {
      tasks.push(
        this.mariadb.pool.query(
          `INSERT INTO cms_users (id, email, name, password_hash, role, is_active, avatar_url, bio, preferred_topics)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), bio=VALUES(bio), avatar_url=VALUES(avatar_url), role=VALUES(role), preferred_topics=VALUES(preferred_topics);`,
          [
            user.id,
            user.email,
            user.name,
            user.passwordHash || '',
            user.role,
            user.isActive ? 1 : 0,
            user.avatarUrl || null,
            user.bio || null,
            JSON.stringify(user.preferredTopics || []),
          ],
        ).catch((e: any) => this.logger.warn(`MariaDB user sync failed: ${e.message}`)),
      );
    }

    // MySQL
    if (this.mysql) {
      tasks.push(
        this.mysql.pool.query(
          `INSERT INTO cms_users (id, email, name, password_hash, role, is_active, avatar_url, bio, preferred_topics)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), bio=VALUES(bio), avatar_url=VALUES(avatar_url), role=VALUES(role), preferred_topics=VALUES(preferred_topics);`,
          [
            user.id,
            user.email,
            user.name,
            user.passwordHash || '',
            user.role,
            user.isActive ? 1 : 0,
            user.avatarUrl || null,
            user.bio || null,
            JSON.stringify(user.preferredTopics || []),
          ],
        ).catch((e: any) => this.logger.warn(`MySQL user sync failed: ${e.message}`)),
      );
    }

    // CockroachDB
    if (this.cockroach) {
      tasks.push(
        this.cockroach.pool.query(
          `INSERT INTO cms_users (id, email, name, password_hash, role, is_active, avatar_url, bio, preferred_topics)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, bio=EXCLUDED.bio, avatar_url=EXCLUDED.avatar_url, role=EXCLUDED.role, preferred_topics=EXCLUDED.preferred_topics, updated_at=now();`,
          [
            user.id,
            user.email,
            user.name,
            user.passwordHash || '',
            user.role,
            user.isActive,
            user.avatarUrl || null,
            user.bio || null,
            JSON.stringify(user.preferredTopics || []),
          ],
        ).catch((e: any) => this.logger.warn(`CockroachDB user sync failed: ${e.message}`)),
      );
    }

    // ClickHouse
    if (this.clickhouse) {
      tasks.push(
        this.clickhouse.client.insert({
          table: 'cms_platform.user_snapshots',
          values: [
            {
              id: String(user.id),
              email: user.email,
              name: user.name,
              role: user.role,
              is_active: user.isActive ? 1 : 0,
              avatar_url: user.avatarUrl || '',
              bio: user.bio || '',
              preferred_topics: user.preferredTopics || [],
            },
          ],
          format: 'JSONEachRow',
        }).catch((e: any) => this.logger.warn(`ClickHouse user sync failed: ${e.message}`)),
      );
    }

    await Promise.allSettled(tasks);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.activeRepo.findById(id);
    if (user) return user;

    try {
      const peerUser = await this.jitReadPeer.findById(id);
      if (peerUser) {
        this.logger.log(`[Seamless Sync] JIT replicating user ${peerUser.email} by ID`);
        const replicated = await this.activeRepo.create({
          email: peerUser.email,
          name: peerUser.name,
          passwordHash: peerUser.passwordHash || '',
          bio: peerUser.bio,
          avatarUrl: peerUser.avatarUrl,
          preferredTopics: peerUser.preferredTopics || [],
          role: peerUser.role,
          isActive: peerUser.isActive,
        });
        this.replicateToAll(replicated).catch(() => {});
        return replicated;
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer DB lookup by ID failed: ${err.message}`);
    }

    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.activeRepo.findByEmail(email);
    if (user) return user;

    try {
      const peerUser = await this.jitReadPeer.findByEmail(email);
      if (peerUser) {
        this.logger.log(`[Seamless Sync] JIT replicating user ${peerUser.email} on login`);
        const replicated = await this.activeRepo.create({
          email: peerUser.email,
          name: peerUser.name,
          passwordHash: peerUser.passwordHash || '',
          bio: peerUser.bio,
          avatarUrl: peerUser.avatarUrl,
          preferredTopics: peerUser.preferredTopics || [],
          role: peerUser.role,
          isActive: peerUser.isActive,
        });
        this.replicateToAll(replicated).catch(() => {});
        return replicated;
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer DB lookup by Email failed: ${err.message}`);
    }

    return null;
  }

  async findMany(filters: UserQueryFilters): Promise<PaginatedResult<User>> {
    return this.activeRepo.findMany(filters);
  }

  async create(data: CreateUserDto): Promise<User> {
    const user = await this.activeRepo.create(data);
    this.replicateToAll(user).catch((e) => this.logger.warn(`Multi-DB User create sync failed: ${e.message}`));
    return user;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const user = await this.activeRepo.update(id, data);
    this.replicateUpdateToAll(id, data).catch((e) => this.logger.warn(`Multi-DB User update sync failed: ${e.message}`));
    return user;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.activeRepo.softDelete(id);
    return result;
  }

  // Password reset operations always go to the primary/active repo only
  // (no cross-DB replication — auth tokens are transactional)
  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    return this.activeRepo.setPasswordResetToken(userId, tokenHash, expiresAt);
  }

  async findByPasswordResetToken(tokenHash: string): Promise<import('../../domain/models').User | null> {
    return this.activeRepo.findByPasswordResetToken(tokenHash);
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    return this.activeRepo.clearPasswordResetToken(userId);
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    return this.activeRepo.updatePassword(userId, newPasswordHash);
  }
}
