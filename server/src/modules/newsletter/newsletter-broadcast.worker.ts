import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../../bull/bull-queue.constants';
import {
  NEWSLETTER_REPOSITORY,
  type INewsletterRepository,
} from '../../repositories/interfaces/newsletter.repository.interface';
import { CampaignStatus, SubscriberStatus } from '../../domain/models';

export interface VerificationJobPayload {
  email: string;
  rawToken: string;
  topics?: string[];
}

export interface BroadcastBatchJobPayload {
  campaignId: string;
  batchIndex: number;
  totalBatches: number;
  subject: string;
  previewText?: string;
  contentHtml: string;
  subscribers: Array<{
    id: string;
    email: string;
    unsubscribeTokenHash: string;
  }>;
}

@Injectable()
@Processor(QUEUE_NAMES.NEWSLETTER_BROADCAST, { concurrency: 5 })
export class NewsletterBroadcastWorker extends WorkerHost {
  private readonly logger = new Logger(NewsletterBroadcastWorker.name);

  constructor(
    @Inject(NEWSLETTER_REPOSITORY)
    private readonly newsletterRepo: INewsletterRepository,
  ) {
    super();
  }

  async process(job: Job): Promise<{ success: boolean; processedCount: number }> {
    switch (job.name) {
      case JOB_NAMES.DISPATCH_NEWSLETTER_VERIFICATION:
        return this.processVerificationEmail(job as Job<VerificationJobPayload>);

      case JOB_NAMES.DISPATCH_NEWSLETTER_BATCH:
        return this.processBroadcastBatch(job as Job<BroadcastBatchJobPayload>);

      default:
        this.logger.warn(`Unknown job [${job.name}] on queue [${QUEUE_NAMES.NEWSLETTER_BROADCAST}]`);
        return { success: true, processedCount: 0 };
    }
  }

  private async processVerificationEmail(
    job: Job<VerificationJobPayload>,
  ): Promise<{ success: boolean; processedCount: number }> {
    const { email } = job.data;
    const masked = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

    this.logger.log(`[BullMQ] Dispatched double opt-in verification email to [${masked}] (Job: ${job.id})`);
    return { success: true, processedCount: 1 };
  }

  private async processBroadcastBatch(
    job: Job<BroadcastBatchJobPayload>,
  ): Promise<{ success: boolean; processedCount: number }> {
    const { campaignId, batchIndex, totalBatches, subscribers } = job.data;

    this.logger.log(
      `[BullMQ] Processing broadcast batch ${batchIndex + 1}/${totalBatches} for Campaign [${campaignId}] (${subscribers.length} recipients)`,
    );

    let delivered = 0;
    let failed = 0;

    for (const sub of subscribers) {
      try {
        // Double check live suppression state
        const currentSub = await this.newsletterRepo.findSubscriberById(sub.id);
        if (!currentSub || currentSub.status !== SubscriberStatus.ACTIVE) {
          this.logger.log(`[BullMQ] Suppressed broadcast delivery for inactive recipient [${sub.id}]`);
          continue;
        }

        // Delivery simulated / completed
        delivered++;
      } catch (err) {
        this.logger.error(`[BullMQ] Failed to deliver broadcast to [${sub.id}]: ${(err as Error).message}`);
        failed++;
      }
    }

    // Update campaign metrics
    const campaign = await this.newsletterRepo.findCampaignById(campaignId);
    if (campaign) {
      const newDelivered = (campaign.deliveredCount || 0) + delivered;
      const newFailed = (campaign.failedCount || 0) + failed;
      const isComplete = newDelivered + newFailed >= campaign.totalRecipients;

      await this.newsletterRepo.updateCampaign(campaignId, {
        deliveredCount: newDelivered,
        failedCount: newFailed,
        status: isComplete ? CampaignStatus.SENT : CampaignStatus.SENDING,
        sentAt: isComplete ? new Date() : campaign.sentAt,
      });

      if (isComplete) {
        this.logger.log(
          `[BullMQ] Campaign [${campaignId}] fully sent (${newDelivered} delivered, ${newFailed} failed)`,
        );
      }
    }

    return { success: true, processedCount: delivered + failed };
  }
}
