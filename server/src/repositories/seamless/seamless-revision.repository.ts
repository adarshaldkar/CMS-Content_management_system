import { Logger } from '@nestjs/common';
import type { ArticleRevision, CreateRevisionDto } from '../../domain/models';
import type { IRevisionRepository } from '../interfaces/revision.repository.interface';

/**
 * SeamlessRevisionRepository
 *
 * Wraps active and peer revision repositories.
 * On revision history lookup on the active DB, if missing, pulls revision snapshots
 * from the peer DB into the active DB.
 */
export class SeamlessRevisionRepository implements IRevisionRepository {
  private readonly logger = new Logger(SeamlessRevisionRepository.name);

  constructor(
    private readonly activeRepo: IRevisionRepository,
    private readonly peerRepo: IRevisionRepository,
    private readonly activeDbName: string,
    private readonly peerDbName: string,
  ) {}

  async create(data: CreateRevisionDto): Promise<ArticleRevision> {
    return this.activeRepo.create(data);
  }

  async findByArticleId(articleId: string): Promise<ArticleRevision[]> {
    const revisions = await this.activeRepo.findByArticleId(articleId);
    if (revisions.length > 0) return revisions;

    try {
      const peerRevisions = await this.peerRepo.findByArticleId(articleId);
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
      const peerRevision = await this.peerRepo.findById(id);
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
