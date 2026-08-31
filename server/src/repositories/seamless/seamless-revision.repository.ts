import { Logger } from '@nestjs/common';
import type { ArticleRevision, CreateRevisionDto } from '../../domain/models';
import type { IRevisionRepository } from '../interfaces/revision.repository.interface';
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
 * SeamlessRevisionRepository
 *
 * Wraps primary/secondary revision repositories plus optional per-engine replicas.
 * On revision history lookup on the active DB, if missing, pulls revision snapshots
 * from the JIT peer store into the active DB. Writes fan out to the main store(s).
 */
export class SeamlessRevisionRepository implements IRevisionRepository, IRuntimeSwitchableRepository {
  private readonly logger = new Logger(SeamlessRevisionRepository.name);

  constructor(
    private readonly primaryRepo: IRevisionRepository,
    private readonly secondaryRepo: IRevisionRepository,
    public readonly primaryName: string,
    public readonly secondaryName: string,
    private readonly mariadbRepo?: IRevisionRepository,
    private readonly mysqlRepo?: IRevisionRepository,
    private readonly cockroachRepo?: IRevisionRepository,
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

  private get postgresStore(): IRevisionRepository {
    return postgresStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get mongoStore(): IRevisionRepository {
    return mongoStoreOf(this.primaryName, this.primaryRepo, this.secondaryRepo);
  }

  private get activeRepo(): IRevisionRepository {
    return selectActiveReadRepo(
      this.primaryName,
      this.primaryRepo,
      this.secondaryRepo,
      this.mariadbRepo,
      this.mysqlRepo,
      this.cockroachRepo,
    );
  }

  private get peerStores(): IRevisionRepository[] {
    const targets: IRevisionRepository[] = [];
    if (shouldReplicateToMongo()) targets.push(this.mongoStore);
    if (shouldReplicateToPostgres()) targets.push(this.postgresStore);
    return targets;
  }

  private get jitReadPeer(): IRevisionRepository {
    return activeEngine() === 'mongodb' ? this.postgresStore : this.mongoStore;
  }

  async create(data: CreateRevisionDto): Promise<ArticleRevision> {
    const revision = await this.activeRepo.create(data);
    for (const store of this.peerStores) {
      store
        .create({
          articleId: revision.articleId,
          version: revision.version,
          title: revision.title,
          description: revision.description,
          content: revision.content,
          authorId: revision.authorId,
          changeSummary: revision.changeSummary,
        })
        .catch((e) => this.logger.debug(`Peer revision sync note: ${e.message}`));
    }
    return revision;
  }

  async findByArticleId(articleId: string): Promise<ArticleRevision[]> {
    const revisions = await this.activeRepo.findByArticleId(articleId);
    if (revisions.length > 0) return revisions;

    try {
      const peerRevisions = await this.jitReadPeer.findByArticleId(articleId);
      if (peerRevisions.length > 0) {
        this.logger.log(
          `[Seamless Sync] JIT replicating ${peerRevisions.length} revisions for article ${articleId} from ${this.peerDbName} to ${this.activeDbName}`,
        );
        const replicated: ArticleRevision[] = [];
        for (const rev of peerRevisions) {
          const created = await this.activeRepo.create({
            articleId: rev.articleId,
            version: rev.version,
            title: rev.title,
            description: rev.description,
            content: rev.content,
            authorId: rev.authorId,
            changeSummary: rev.changeSummary,
          });
          replicated.push(created);
        }
        return replicated;
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Revision lookup for article ${articleId} failed: ${err.message}`);
    }

    return [];
  }

  async findById(id: string): Promise<ArticleRevision | null> {
    const revision = await this.activeRepo.findById(id);
    if (revision) return revision;

    try {
      const peerRevision = await this.jitReadPeer.findById(id);
      if (peerRevision) {
        this.logger.log(
          `[Seamless Sync] JIT replicating revision v${peerRevision.version} for article ${peerRevision.articleId} from ${this.peerDbName} to ${this.activeDbName}`,
        );
        return await this.activeRepo.create({
          articleId: peerRevision.articleId,
          version: peerRevision.version,
          title: peerRevision.title,
          description: peerRevision.description,
          content: peerRevision.content,
          authorId: peerRevision.authorId,
          changeSummary: peerRevision.changeSummary,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Revision lookup by ID failed: ${err.message}`);
    }

    return null;
  }
}