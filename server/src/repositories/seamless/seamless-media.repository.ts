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

  async create(data: CreateMediaDto): Promise<Media> {
    const media = await this.activeRepo.create(data);
    for (const store of this.peerStores) {
      store
        .create({
          filename: media.filename,
          originalName: media.originalName,
          mimeType: media.mimeType,
          size: media.size,
          url: media.url,
          uploadedBy: media.uploadedBy,
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
          `[Seamless Sync] JIT replicating media "${peerMedia.originalName}" from ${this.peerDbName} to ${this.activeDbName}`,
        );
        return await this.activeRepo.create({
          filename: peerMedia.filename,
          originalName: peerMedia.originalName,
          mimeType: peerMedia.mimeType,
          size: peerMedia.size,
          url: peerMedia.url,
          uploadedBy: peerMedia.uploadedBy,
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

  async delete(id: string): Promise<boolean> {
    const result = await this.activeRepo.delete(id);
    for (const store of this.peerStores) {
      store.delete(id).catch(() => {});
    }
    return result;
  }
}