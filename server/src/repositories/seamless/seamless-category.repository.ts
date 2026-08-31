import { Logger } from '@nestjs/common';
import type {
  Category,
  CategoryQueryFilters,
  CreateCategoryDto,
  PaginatedResult,
  UpdateCategoryDto,
} from '../../domain/models';
import type { ICategoryRepository } from '../interfaces/category.repository.interface';
import type { SupportedDbName, IRuntimeSwitchableRepository } from '../repository-proxy';
import {
  activeEngine,
  mongoStoreOf,
  postgresStoreOf,
  selectActiveReadRepo,
  shouldReplicateToMongo,
  shouldReplicateToPostgres,
} from './db-router.util';

/**
 * SeamlessCategoryRepository
 *
 * Wraps primary/secondary category repositories plus optional per-engine replicas.
 * On a category miss in the active DB, pulls the category definition from the JIT peer
 * store and replicates it into the active DB. Writes fan out to the main store(s).
 */
export class SeamlessCategoryRepository implements ICategoryRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessCategoryRepository.name);

  constructor(
    private readonly primaryRepo: ICategoryRepository,
    private readonly secondaryRepo: ICategoryRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadbRepo?: ICategoryRepository,
    private readonly mysqlRepo?: ICategoryRepository,
    private readonly cockroachRepo?: ICategoryRepository,
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

  private get postgresStore(): ICategoryRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): ICategoryRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): ICategoryRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): ICategoryRepository[] {
    const targets: ICategoryRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): ICategoryRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  async findById(id: string): Promise<Category | null> {
    const category = await this.activeRepo.findById(id);
    if (category) return category;

    try {
      const peerCategory = await this.jitReadPeer.findById(id);
      if (peerCategory) {
        this.logger.log(
          `[Seamless Sync] JIT replicating category "${peerCategory.name}" from ${this.peerDbName} to ${this.activeDbName} by ID`,
        );
        return await this.activeRepo.create({
          name: peerCategory.name,
          slug: peerCategory.slug,
          description: peerCategory.description,
          status: peerCategory.status,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Category lookup by ID failed: ${err.message}`);
    }

    return null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const category = await this.activeRepo.findBySlug(slug);
    if (category) return category;

    try {
      const peerCategory = await this.jitReadPeer.findBySlug(slug);
      if (peerCategory) {
        this.logger.log(
          `[Seamless Sync] JIT replicating category "${peerCategory.name}" from ${this.peerDbName} to ${this.activeDbName} by Slug`,
        );
        return await this.activeRepo.create({
          name: peerCategory.name,
          slug: peerCategory.slug,
          description: peerCategory.description,
          status: peerCategory.status,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Category lookup by Slug failed: ${err.message}`);
    }

    return null;
  }

  async findMany(filters: CategoryQueryFilters): Promise<PaginatedResult<Category>> {
    return this.activeRepo.findMany(filters);
  }

  async create(data: CreateCategoryDto): Promise<Category> {
    const category = await this.activeRepo.create(data);
    for (const store of this.peerStores) {
      store
        .create({
          name: category.name,
          slug: category.slug,
          description: category.description,
          status: category.status,
        })
        .catch((e) => this.logger.debug(`Peer category sync note: ${e.message}`));
    }
    return category;
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    const category = await this.activeRepo.update(id, data);
    for (const store of this.peerStores) {
      store.update(id, data).catch((e) => this.logger.debug(`Peer category update note: ${e.message}`));
    }
    return category;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.activeRepo.softDelete(id);
    for (const store of this.peerStores) {
      store.softDelete(id).catch(() => {});
    }
    return result;
  }
}