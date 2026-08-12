import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ARTICLE_REPOSITORY,
  type IArticleRepository,
} from '../../repositories/interfaces/article.repository.interface';
import { AuditService } from '../audit/audit.service';
import { AuditEventType, ContentStatus } from '../../domain/models';

@Injectable()
export class PublisherWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublisherWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit(): void {
    // Run publisher worker every 60 seconds
    this.timer = setInterval(() => {
      void this.processDueArticles();
    }, 60000);
    this.logger.log('Scheduled Publisher Worker initialized.');
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async processDueArticles(): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }
    this.isProcessing = true;

    try {
      // Find all scheduled articles
      const scheduledResult = await this.articleRepo.findMany({
        status: ContentStatus.SCHEDULED,
        limit: 100,
      });

      const now = new Date();
      let promotedCount = 0;

      for (const article of scheduledResult.items) {
        if (article.scheduledAt && new Date(article.scheduledAt) <= now) {
          // Atomic update
          const updated = await this.articleRepo.update(article.id, {
            status: ContentStatus.PUBLISHED,
            publishedAt: now,
            scheduledAt: null,
          });

          if (updated && updated.status === ContentStatus.PUBLISHED) {
            promotedCount++;
            await this.auditService.log({
              action: AuditEventType.ARTICLE_STATUS_CHANGED,
              resource: `Article:${article.id}`,
              result: 'SUCCESS',
              metadata: {
                trigger: 'AUTOMATED_SCHEDULED_PUBLISHER',
                from: ContentStatus.SCHEDULED,
                to: ContentStatus.PUBLISHED,
              },
            });
            this.logger.log(`Promoted scheduled article "${article.title}" to PUBLISHED.`);
          }
        }
      }

      return promotedCount;
    } catch (err) {
      this.logger.error('Error in PublisherWorker', (err as Error).stack);
      return 0;
    } finally {
      this.isProcessing = false;
    }
  }
}
