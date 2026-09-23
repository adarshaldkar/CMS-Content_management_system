import { Logger } from '@nestjs/common';
import type { CreateMediaDto, Media, PaginatedResult } from '../../domain/models';
import type { IMediaRepository, MediaFilters } from '../interfaces/media.repository.interface';
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
 * SeamlessMediaRepository
 *
 * Wraps primary/secondary media repositories plus optional per-engine replicas.
 * Physical media assets exist on shared disk (/uploads). On metadata miss in the
 * active DB, copies the media record from the JIT peer store into the active DB.
 * Writes fan out to the main store(s).
 */
export class SeamlessMediaRepository implements IMediaRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessMediaRepository.name);

  constructor(
    private readonly primaryRepo: IMediaRepository,
    private readonly secondaryRepo: IMediaRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadbRepo?: IMediaRepository,
    private readonly mysqlRepo?: IMediaRepository,
    private readonly cockroachRepo?: IMediaRepository,
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

  private get postgresStore(): IMediaRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): IMediaRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): IMediaRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): IMediaRepository[] {
    const targets: IMediaRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): IMediaRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  private get allSecondaryStores(): IMediaRepository[] {
    const targets = [...this.peerStores];
    if (this.mariadbRepo && this.activeRepo !== this.mariadbRepo) targets.push(this.mariadbRepo);
    if (this.mysqlRepo && this.activeRepo !== this.mysqlRepo) targets.push(this.mysqlRepo);
    if (this.cockroachRepo && this.activeRepo !== this.cockroachRepo) targets.push(this.cockroachRepo);
    return targets;
  }

  async create(data: CreateMediaDto): Promise<Media> {
    const media = await this.activeRepo.create(data);
    for (const store of this.allSecondaryStores) {
      store
        .create({
          id: media.id,
          filename: media.filename,
          originalName: media.originalName,
          mimeType: media.mimeType,
          size: media.size,
          url: media.url,
          uploadedBy: media.uploadedBy,
          processingStatus: media.processingStatus,
          aspectRatio: media.aspectRatio,
          usageProfile: media.usageProfile,
          storageKey: media.storageKey,
          cdnUrl: media.cdnUrl,
          variants: media.variants,
          optimization: media.optimization,
        })
        .catch((e) => this.logger.debug(`Peer media sync note: ${e.message}`));
    }
    return media;
  }

  async findById(id: string): Promise<Media | null> {
    const media = await this.activeRepo.findById(id);
    if (media) return media;

    try {
      const peerMedia = await this.jitReadPeer.findById(id);
      if (peerMedia) {
        this.logger.log(
          `[Seamless Sync] JIT replicating media "${peerMedia.originalName}" (${peerMedia.id}) from ${this.peerDbName} to ${this.activeDbName}`,
        );
        return await this.activeRepo.create({
          id: peerMedia.id,
          filename: peerMedia.filename,
          originalName: peerMedia.originalName,
          mimeType: peerMedia.mimeType,
          size: peerMedia.size,
          url: peerMedia.url,
          uploadedBy: peerMedia.uploadedBy,
          processingStatus: peerMedia.processingStatus,
          aspectRatio: peerMedia.aspectRatio,
          usageProfile: peerMedia.usageProfile,
          storageKey: peerMedia.storageKey,
          cdnUrl: peerMedia.cdnUrl,
          variants: peerMedia.variants,
          optimization: peerMedia.optimization,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Media lookup by ID failed: ${err.message}`);
    }

    return null;
  }

  async findMany(filters: MediaFilters): Promise<PaginatedResult<Media>> {
    return this.activeRepo.findMany(filters);
  }

  async update(id: string, updates: Partial<Media>): Promise<Media | null> {
    const updated = await this.activeRepo.update(id, updates);
    for (const store of this.allSecondaryStores) {
      store.update(id, updates).catch(() => {});
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.activeRepo.delete(id);
    for (const store of this.allSecondaryStores) {
      store.delete(id).catch(() => {});
    }
    return result;
  }
}