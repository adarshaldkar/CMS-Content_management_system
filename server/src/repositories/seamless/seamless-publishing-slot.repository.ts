import { Logger } from '@nestjs/common';
import type {
  AssignAuthorSlotDto,
  AuthorClearanceInfo,
  AuthorSlotAssignment,
  CreatePublishingSlotDto,
  PublishingSlot,
  UpdatePublishingSlotDto,
} from '../../domain/models';
import type { IPublishingSlotRepository } from '../interfaces/publishing-slot.repository.interface';
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

export class SeamlessPublishingSlotRepository
  implements IPublishingSlotRepository, IRuntimeSwitchableRepository
{
  private readonly logger = new Logger(SeamlessPublishingSlotRepository.name);

  constructor(
    private readonly primaryRepo: IPublishingSlotRepository,
    private readonly secondaryRepo: IPublishingSlotRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadb?: MariaDbService,
    private readonly mysql?: MySqlService,
    private readonly cockroach?: CockroachDbService,
    private readonly mariadbRepo?: IPublishingSlotRepository,
    private readonly mysqlRepo?: IPublishingSlotRepository,
    private readonly cockroachRepo?: IPublishingSlotRepository,
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

  private get postgresStore(): IPublishingSlotRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): IPublishingSlotRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): IPublishingSlotRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): IPublishingSlotRepository[] {
    const targets: IPublishingSlotRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): IPublishingSlotRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  private async replicateSlot(slot: PublishingSlot): Promise<void> {
    const tasks: Promise<any>[] = [];

    for (const store of this.peerStores) {
      tasks.push(
        store
          .createSlot({
            name: slot.name,
            slug: slot.slug,
            dispatchTime: slot.dispatchTime,
            timezone: slot.timezone,
            daysActive: slot.daysActive,
            maxArticlesPerSlot: slot.maxArticlesPerSlot,
            staggerMinutes: slot.staggerMinutes,
            isActive: slot.isActive,
          })
          .catch((e) => this.logger.debug(`Peer slot sync note: ${e.message}`)),
      );
    }

    if (this.mariadb) {
      tasks.push(
        this.mariadb.pool
          .query(
            `INSERT INTO cms_publishing_slots (id, name, slug, dispatch_time, timezone, days_active, max_articles_per_slot, stagger_minutes, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), dispatch_time=VALUES(dispatch_time), timezone=VALUES(timezone), days_active=VALUES(days_active), max_articles_per_slot=VALUES(max_articles_per_slot), stagger_minutes=VALUES(stagger_minutes), is_active=VALUES(is_active);`,
            [
              slot.id,
              slot.name,
              slot.slug,
              slot.dispatchTime,
              slot.timezone,
              slot.daysActive,
              slot.maxArticlesPerSlot,
              slot.staggerMinutes,
              slot.isActive ? 1 : 0,
            ],
          )
          .catch((e: any) => this.logger.warn(`MariaDB slot sync failed: ${e.message}`)),
      );
    }

    if (this.mysql) {
      tasks.push(
        this.mysql.pool
          .query(
            `INSERT INTO cms_publishing_slots (id, name, slug, dispatch_time, timezone, days_active, max_articles_per_slot, stagger_minutes, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), dispatch_time=VALUES(dispatch_time), timezone=VALUES(timezone), days_active=VALUES(days_active), max_articles_per_slot=VALUES(max_articles_per_slot), stagger_minutes=VALUES(stagger_minutes), is_active=VALUES(is_active);`,
            [
              slot.id,
              slot.name,
              slot.slug,
              slot.dispatchTime,
              slot.timezone,
              slot.daysActive,
              slot.maxArticlesPerSlot,
              slot.staggerMinutes,
              slot.isActive ? 1 : 0,
            ],
          )
          .catch((e: any) => this.logger.warn(`MySQL slot sync failed: ${e.message}`)),
      );
    }

    if (this.cockroach) {
      tasks.push(
        this.cockroach.pool
          .query(
            `INSERT INTO cms_publishing_slots (id, name, slug, dispatch_time, timezone, days_active, max_articles_per_slot, stagger_minutes, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, dispatch_time=EXCLUDED.dispatch_time, timezone=EXCLUDED.timezone, days_active=EXCLUDED.days_active, max_articles_per_slot=EXCLUDED.max_articles_per_slot, stagger_minutes=EXCLUDED.stagger_minutes, is_active=EXCLUDED.is_active, updated_at=now();`,
            [
              slot.id,
              slot.name,
              slot.slug,
              slot.dispatchTime,
              slot.timezone,
              slot.daysActive,
              slot.maxArticlesPerSlot,
              slot.staggerMinutes,
              slot.isActive,
              slot.createdAt,
              slot.updatedAt,
            ],
          )
          .catch((e: any) => this.logger.warn(`CockroachDB slot sync failed: ${e.message}`)),
      );
    }

    await Promise.allSettled(tasks);
  }

  private async replicateAssignment(assignment: AuthorSlotAssignment): Promise<void> {
    const tasks: Promise<any>[] = [];

    for (const store of this.peerStores) {
      tasks.push(
        store
          .assignAuthorToSlot(
            {
              authorId: assignment.authorId,
              slotId: assignment.slotId,
              autoPublishEnabled: assignment.autoPublishEnabled,
              dailyQuota: assignment.dailyQuota,
            },
            assignment.assignedBy ?? undefined,
          )
          .catch((e) => this.logger.debug(`Peer assignment sync note: ${e.message}`)),
      );
    }

    if (this.mariadb) {
      tasks.push(
        this.mariadb.pool
          .query(
            `INSERT INTO cms_author_slot_assignments (id, author_id, slot_id, auto_publish_enabled, daily_quota, assigned_by)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE slot_id=VALUES(slot_id), auto_publish_enabled=VALUES(auto_publish_enabled), daily_quota=VALUES(daily_quota), assigned_by=VALUES(assigned_by);`,
            [
              assignment.id,
              assignment.authorId,
              assignment.slotId,
              assignment.autoPublishEnabled ? 1 : 0,
              assignment.dailyQuota,
              assignment.assignedBy || null,
            ],
          )
          .catch((e: any) => this.logger.warn(`MariaDB assignment sync failed: ${e.message}`)),
      );
    }

    if (this.mysql) {
      tasks.push(
        this.mysql.pool
          .query(
            `INSERT INTO cms_author_slot_assignments (id, author_id, slot_id, auto_publish_enabled, daily_quota, assigned_by)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE slot_id=VALUES(slot_id), auto_publish_enabled=VALUES(auto_publish_enabled), daily_quota=VALUES(daily_quota), assigned_by=VALUES(assigned_by);`,
            [
              assignment.id,
              assignment.authorId,
              assignment.slotId,
              assignment.autoPublishEnabled ? 1 : 0,
              assignment.dailyQuota,
              assignment.assignedBy || null,
            ],
          )
          .catch((e: any) => this.logger.warn(`MySQL assignment sync failed: ${e.message}`)),
      );
    }

    if (this.cockroach) {
      tasks.push(
        this.cockroach.pool
          .query(
            `INSERT INTO cms_author_slot_assignments (id, author_id, slot_id, auto_publish_enabled, daily_quota, assigned_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (author_id) DO UPDATE SET slot_id=EXCLUDED.slot_id, auto_publish_enabled=EXCLUDED.auto_publish_enabled, daily_quota=EXCLUDED.daily_quota, assigned_by=EXCLUDED.assigned_by;`,
            [
              assignment.id,
              assignment.authorId,
              assignment.slotId,
              assignment.autoPublishEnabled,
              assignment.dailyQuota,
              assignment.assignedBy || null,
              assignment.createdAt,
            ],
          )
          .catch((e: any) => this.logger.warn(`CockroachDB assignment sync failed: ${e.message}`)),
      );
    }

    await Promise.allSettled(tasks);
  }

  private async peerDeleteSlot(id: string): Promise<void> {
    for (const store of this.peerStores) {
      store.deleteSlot(id).catch(() => {});
    }
    if (this.mariadb) {
      this.mariadb.pool
        .query(`DELETE FROM cms_author_slot_assignments WHERE slot_id = ?`, [id])
        .then(() => this.mariadb!.pool.query(`DELETE FROM cms_publishing_slots WHERE id = ? OR slug = ?`, [id, id]))
        .catch((e: any) => this.logger.debug(`MariaDB slot delete note: ${e.message}`));
    }
    if (this.mysql) {
      this.mysql.pool
        .query(`DELETE FROM cms_author_slot_assignments WHERE slot_id = ?`, [id])
        .then(() => this.mysql!.pool.query(`DELETE FROM cms_publishing_slots WHERE id = ? OR slug = ?`, [id, id]))
        .catch((e: any) => this.logger.debug(`MySQL slot delete note: ${e.message}`));
    }
    if (this.cockroach) {
      this.cockroach.pool
        .query(`DELETE FROM cms_author_slot_assignments WHERE slot_id = $1`, [id])
        .then(() => this.cockroach!.pool.query(`DELETE FROM cms_publishing_slots WHERE id = $1 OR slug = $1`, [id]))
        .catch((e: any) => this.logger.debug(`CockroachDB slot delete note: ${e.message}`));
    }
  }

  async findAllSlots(): Promise<PublishingSlot[]> {
    return this.activeRepo.findAllSlots();
  }

  async findSlotById(id: string): Promise<PublishingSlot | null> {
    const slot = await this.activeRepo.findSlotById(id);
    if (slot) return slot;
    try {
      const peerSlot = await this.jitReadPeer.findSlotById(id);
      if (peerSlot) {
        this.logger.log(`[Seamless Sync] JIT replicating slot "${peerSlot.name}" by ID`);
        const replicated = await this.activeRepo.createSlot({
          name: peerSlot.name,
          slug: peerSlot.slug,
          dispatchTime: peerSlot.dispatchTime,
          timezone: peerSlot.timezone,
          daysActive: peerSlot.daysActive,
          maxArticlesPerSlot: peerSlot.maxArticlesPerSlot,
          staggerMinutes: peerSlot.staggerMinutes,
          isActive: peerSlot.isActive,
        });
        this.replicateSlot(replicated).catch(() => {});
        return replicated;
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer DB lookup by slot ID failed: ${err.message}`);
    }
    return null;
  }

  async findSlotBySlug(slug: string): Promise<PublishingSlot | null> {
    const slot = await this.activeRepo.findSlotBySlug(slug);
    if (slot) return slot;
    try {
      const peerSlot = await this.jitReadPeer.findSlotBySlug(slug);
      if (peerSlot) {
        this.logger.log(`[Seamless Sync] JIT replicating slot "${peerSlot.name}" by slug`);
        const replicated = await this.activeRepo.createSlot({
          name: peerSlot.name,
          slug: peerSlot.slug,
          dispatchTime: peerSlot.dispatchTime,
          timezone: peerSlot.timezone,
          daysActive: peerSlot.daysActive,
          maxArticlesPerSlot: peerSlot.maxArticlesPerSlot,
          staggerMinutes: peerSlot.staggerMinutes,
          isActive: peerSlot.isActive,
        });
        this.replicateSlot(replicated).catch(() => {});
        return replicated;
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Peer DB lookup by slot slug failed: ${err.message}`);
    }
    return null;
  }

  async createSlot(dto: CreatePublishingSlotDto): Promise<PublishingSlot> {
    const slot = await this.activeRepo.createSlot(dto);
    this.replicateSlot(slot).catch((e) =>
      this.logger.warn(`Multi-DB Slot create sync failed: ${e.message}`),
    );
    return slot;
  }

  async updateSlot(id: string, dto: UpdatePublishingSlotDto): Promise<PublishingSlot | null> {
    const slot = await this.activeRepo.updateSlot(id, dto);
    if (slot) {
      this.replicateSlot(slot).catch((e) =>
        this.logger.warn(`Multi-DB Slot update sync failed: ${e.message}`),
      );
    }
    return slot;
  }

  async deleteSlot(id: string): Promise<boolean> {
    const result = await this.activeRepo.deleteSlot(id);
    this.peerDeleteSlot(id);
    return result;
  }

  async findAllAssignments(): Promise<AuthorSlotAssignment[]> {
    return this.activeRepo.findAllAssignments();
  }

  async findAssignmentByAuthorId(authorId: string): Promise<AuthorSlotAssignment | null> {
    return this.activeRepo.findAssignmentByAuthorId(authorId);
  }

  async assignAuthorToSlot(dto: AssignAuthorSlotDto, assignedBy?: string): Promise<AuthorSlotAssignment> {
    const assignment = await this.activeRepo.assignAuthorToSlot(dto, assignedBy);
    this.replicateAssignment(assignment).catch((e) =>
      this.logger.warn(`Multi-DB Assignment create sync failed: ${e.message}`),
    );
    return assignment;
  }

  async revokeAuthorAssignment(authorId: string): Promise<boolean> {
    const result = await this.activeRepo.revokeAuthorAssignment(authorId);
    for (const store of this.peerStores) {
      store.revokeAuthorAssignment(authorId).catch(() => {});
    }
    if (this.mariadb) {
      this.mariadb.pool
        .query(`DELETE FROM cms_author_slot_assignments WHERE author_id = ?`, [authorId])
        .catch((e: any) => this.logger.debug(`MariaDB revoke note: ${e.message}`));
    }
    if (this.mysql) {
      this.mysql.pool
        .query(`DELETE FROM cms_author_slot_assignments WHERE author_id = ?`, [authorId])
        .catch((e: any) => this.logger.debug(`MySQL revoke note: ${e.message}`));
    }
    if (this.cockroach) {
      this.cockroach.pool
        .query(`DELETE FROM cms_author_slot_assignments WHERE author_id = $1`, [authorId])
        .catch((e: any) => this.logger.debug(`CockroachDB revoke note: ${e.message}`));
    }
    return result;
  }

  async getAuthorClearance(authorId: string): Promise<AuthorClearanceInfo> {
    return this.activeRepo.getAuthorClearance(authorId);
  }

  async getQueuedArticlesCount(slotId: string): Promise<number> {
    return this.activeRepo.getQueuedArticlesCount(slotId);
  }

  async getUpcomingScheduledArticles(limit = 10): Promise<any[]> {
    return this.activeRepo.getUpcomingScheduledArticles(limit);
  }
}