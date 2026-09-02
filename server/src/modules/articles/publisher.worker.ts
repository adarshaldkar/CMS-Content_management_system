import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import {
  ARTICLE_REPOSITORY,
  type IArticleRepository,
} from '../../repositories/interfaces/article.repository.interface';
import { AuditService } from '../audit/audit.service';
import { AuditEventType, ContentStatus } from '../../domain/models';
import { QUEUE_NAMES, JOB_NAMES } from '../../bull/bull-queue.constants';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../domain/notification.model';

export interface ScheduledPublishJobPayload {
  articleId: string;
  version: number;
  scheduledAt: string;
  publishingSlotId?: string | null;
  enqueuedByUserId: string;
  enqueuedAt: string;
}

@Processor(QUEUE_NAMES.SCHEDULED_PUBLISHING, {
  concurrency: 5,
  lockDuration: 30000,
  stalledInterval: 30000,
  maxStalledCount: 2,
})
@Injectable()
export class PublisherWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(PublisherWorker.name);

  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
    private readonly auditService: AuditService,
    private readonly redisService: RedisService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.SCHEDULED_PUBLISHING)
    private readonly publishingQueue?: Queue,
  ) {
    super();
  }

  /**
   * On startup, reconcile any SCHEDULED articles in the database that may lack a delayed BullMQ job
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('BullMQ Scheduled Publisher Worker initialized.');
    await this.reconcileMissedSchedules();
  }

  /**
   * Process delayed BullMQ publication job with strict Idempotency and Fencing Tokens
   */
  async process(
    job: Job<ScheduledPublishJobPayload>,
  ): Promise<{ success: boolean; published: boolean; reason?: string }> {
    const { articleId, version, publishingSlotId } = job.data;

    // Handle simulated test drill tasks
    if ((job.data as any)?.simulation) {
      if ((job.data as any).purpose?.includes('Simulated Dead-Letter')) {
        this.logger.warn(`Simulating DLQ Failure drill for job [${job.id}]`);
        throw new Error('Simulated DLQ drill exception: Database connection timeout during background dispatch.');
      }
      this.logger.log(`Simulated test job [${job.id}] completed successfully.`);
      return { success: true, published: true, reason: 'SIMULATED_TEST_JOB' };
    }

    this.logger.log(`Processing scheduled publish job [${job.id}] for article [${articleId}] (version ${version})`);

    const article = await this.articleRepo.findById(articleId);

    // Idempotency Rule 1: Article existence check
    if (!article) {
      this.logger.warn(`Article [${articleId}] not found for scheduled job [${job.id}]. Discarding.`);
      return { success: true, published: false, reason: 'ARTICLE_NOT_FOUND' };
    }

    // Idempotency Rule 2: If already PUBLISHED, return clean No-Op
    if (article.status === ContentStatus.PUBLISHED) {
      this.logger.log(`Article [${articleId}] is already PUBLISHED. Safe No-Op for job [${job.id}].`);
      return { success: true, published: false, reason: 'ALREADY_PUBLISHED' };
    }

    // Idempotency Rule 3: Fencing token validation (status must be SCHEDULED and version must match)
    if (article.status !== ContentStatus.SCHEDULED) {
      this.logger.warn(
        `Article [${articleId}] status is ${article.status} (expected SCHEDULED). Discarding job [${job.id}].`,
      );
      return { success: true, published: false, reason: 'INVALID_STATUS' };
    }

    if (article.version !== version) {
      this.logger.warn(
        `Stale version for article [${articleId}]. Current version: ${article.version}, job version: ${version}. Discarding job [${job.id}].`,
      );
      return { success: true, published: false, reason: 'STALE_VERSION' };
    }

    const now = new Date();
    const updated = await this.articleRepo.update(article.id, {
      status: ContentStatus.PUBLISHED,
      publishedAt: now,
      scheduledAt: null,
      version: article.version + 1,
    });

    if (!updated || updated.status !== ContentStatus.PUBLISHED) {
      throw new Error(`Failed to update article [${articleId}] to PUBLISHED status`);
    }

    // Write audit trail
    await this.auditService.log({
      action: AuditEventType.ARTICLE_STATUS_CHANGED,
      resource: `Article:${article.id}`,
      result: 'SUCCESS',
      metadata: {
        trigger: 'BULLMQ_SCHEDULED_PUBLISHER',
        jobId: job.id,
        from: ContentStatus.SCHEDULED,
        to: ContentStatus.PUBLISHED,
        publishingSlotId: publishingSlotId || null,
      },
    });

    // Invalidate L2 caching
    await this.redisService.delCached(`cache:article:${article.slug}`, `cache:articles:*`);

    // Dispatch author notification
    if (this.notificationsService && article.authorId) {
      try {
        await this.notificationsService.notify({
          userId: article.authorId,
          actorName: 'The Gazette Desk',
          type: NotificationType.ARTICLE_PUBLISHED,
          title: 'Story Published',
          message: `Your scheduled story "${article.title}" is now live on the Front Page.`,
          resourceType: 'article',
          resourceId: article.id,
          resourceSlug: article.slug,
        });
      } catch (notifErr) {
        this.logger.warn(`Failed to dispatch publication notification for [${articleId}]: ${(notifErr as Error).message}`);
      }
    }

    this.logger.log(`Successfully published scheduled article "${article.title}" [${article.id}].`);
    return { success: true, published: true };
  }

  /**
   * Reconcile any SCHEDULED articles on boot that have passed or are upcoming
   */
  private async reconcileMissedSchedules(): Promise<void> {
    try {
      const scheduledResult = await this.articleRepo.findMany({
        status: ContentStatus.SCHEDULED,
        limit: 100,
      });

      const now = new Date();
      for (const article of scheduledResult.items) {
        if (!article.scheduledAt) continue;

        const scheduledTime = new Date(article.scheduledAt);
        if (scheduledTime <= now) {
          // Overdue schedule: publish immediately
          const updated = await this.articleRepo.update(article.id, {
            status: ContentStatus.PUBLISHED,
            publishedAt: now,
            scheduledAt: null,
            version: article.version + 1,
          });

          if (updated && updated.status === ContentStatus.PUBLISHED) {
            await this.auditService.log({
              action: AuditEventType.ARTICLE_STATUS_CHANGED,
              resource: `Article:${article.id}`,
              result: 'SUCCESS',
              metadata: {
                trigger: 'BULLMQ_BOOTSTRAP_RECONCILIATION',
                from: ContentStatus.SCHEDULED,
                to: ContentStatus.PUBLISHED,
              },
            });
            this.logger.log(`Reconciliation promoted overdue article "${article.title}" to PUBLISHED.`);
          }
        } else if (this.publishingQueue) {
          // Future schedule: ensure delayed BullMQ job exists
          const delayMs = Math.max(0, scheduledTime.getTime() - now.getTime());
          const jobId = `job:publish:${article.id}:${article.version}`;
          await this.publishingQueue.add(
            JOB_NAMES.PUBLISH_SCHEDULED_ARTICLE,
            {
              articleId: article.id,
              version: article.version,
              scheduledAt: scheduledTime.toISOString(),
              publishingSlotId: article.publishingSlotId || null,
              enqueuedByUserId: article.authorId,
              enqueuedAt: now.toISOString(),
            },
            {
              jobId,
              delay: delayMs,
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
            },
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Error during scheduled articles reconciliation: ${(err as Error).message}`);
    }
  }
}
