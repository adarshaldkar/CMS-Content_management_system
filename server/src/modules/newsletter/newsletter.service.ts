import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import {
  NEWSLETTER_REPOSITORY,
  type INewsletterRepository,
} from '../../repositories/interfaces/newsletter.repository.interface';
import {
  SubscriberStatus,
  CampaignStatus,
  DigestFrequency,
  type NewsletterSubscriber,
  type NewsletterCampaign,
  type SubscribeDto,
  type UpdateSubscriberPreferencesDto,
  type CreateCampaignDto,
  type SubscriberQueryFilters,
  type NewsletterStats,
} from '../../domain/models';
import { QUEUE_NAMES, JOB_NAMES } from '../../bull/bull-queue.constants';
import { sanitizeArticleContent } from '../../common/utils/sanitizer.util';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @Inject(NEWSLETTER_REPOSITORY)
    private readonly newsletterRepo: INewsletterRepository,
    @InjectQueue(QUEUE_NAMES.NEWSLETTER_BROADCAST)
    private readonly broadcastQueue: Queue,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private maskEmail(email: string): string {
    return email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  }

  /**
   * Public double opt-in subscription
   */
  async subscribe(dto: SubscribeDto): Promise<{
    message: string;
    status: SubscriberStatus;
    email: string;
    isAlreadySubscribed: boolean;
    verificationToken?: string;
  }> {
    const email = dto.email?.toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('A valid email address is required.');
    }

    const existing = await this.newsletterRepo.findSubscriberByEmail(email);

    if (existing && existing.status === SubscriberStatus.ACTIVE) {
      return {
        message: 'You are already an active subscriber to The Gazette.',
        status: SubscriberStatus.ACTIVE,
        email: this.maskEmail(email),
        isAlreadySubscribed: true,
      };
    }

    // Generate fresh high-entropy verification token and 48-hour TTL
    const rawVerificationToken = this.generateSecureToken();
    const verificationTokenHash = this.hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    if (existing) {
      // Rotate token and update subscriber back to PENDING_VERIFICATION
      await this.newsletterRepo.updateSubscriber(existing.id, {
        status: SubscriberStatus.PENDING_VERIFICATION,
        verificationTokenHash,
        verificationTokenExpiresAt: verificationExpiresAt,
        topics: dto.topics || existing.topics,
        frequency: dto.frequency || existing.frequency,
      });
    } else {
      // Create new subscriber with durable unsubscribe capability hash
      const rawUnsubscribeToken = this.generateSecureToken();
      const unsubscribeTokenHash = this.hashToken(rawUnsubscribeToken);

      await this.newsletterRepo.createSubscriber({
        email,
        status: SubscriberStatus.PENDING_VERIFICATION,
        topics: dto.topics || [],
        frequency: dto.frequency || DigestFrequency.DAILY,
        verificationTokenHash,
        verificationTokenExpiresAt: verificationExpiresAt,
        unsubscribeTokenHash,
        bounceCount: 0,
        verifiedAt: null,
        unsubscribedAt: null,
        lastBouncedAt: null,
      });
    }

    // Enqueue verification email job onto dedicated BullMQ queue
    await this.broadcastQueue.add(
      JOB_NAMES.DISPATCH_NEWSLETTER_VERIFICATION,
      {
        email,
        rawToken: rawVerificationToken,
        topics: dto.topics,
      },
      {
        jobId: `job_verify_${this.hashToken(email)}_${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    this.logger.log(`Enqueued verification email for subscriber [${this.maskEmail(email)}]`);

    return {
      message: 'Verification link dispatched. Please confirm your subscription within 48 hours.',
      status: SubscriberStatus.PENDING_VERIFICATION,
      email: this.maskEmail(email),
      isAlreadySubscribed: false,
      verificationToken: rawVerificationToken, // Provided for automated validation / local testing
    };
  }

  /**
   * Public double opt-in verification
   */
  async verify(rawToken: string): Promise<{
    message: string;
    subscriber: {
      email: string;
      topics: string[];
      frequency: DigestFrequency;
      status: SubscriberStatus;
      verifiedAt: Date;
      unsubscribeTokenHash: string;
    };
  }> {
    if (!rawToken || rawToken.length < 16) {
      throw new BadRequestException('Invalid verification token.');
    }

    const tokenHash = this.hashToken(rawToken);
    const subscriber = await this.newsletterRepo.findSubscriberByVerifyTokenHash(tokenHash);

    if (!subscriber) {
      throw new BadRequestException('Invalid or expired verification link.');
    }

    if (
      subscriber.verificationTokenExpiresAt &&
      subscriber.verificationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('This verification link has expired. Please subscribe again to receive a fresh link.');
    }

    const verifiedAt = new Date();
    await this.newsletterRepo.updateSubscriber(subscriber.id, {
      status: SubscriberStatus.ACTIVE,
      verifiedAt,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });

    this.logger.log(`Subscriber [${this.maskEmail(subscriber.email)}] verified and activated successfully.`);

    return {
      message: 'Your subscription to The Gazette has been verified and activated.',
      subscriber: {
        email: subscriber.email,
        topics: subscriber.topics,
        frequency: subscriber.frequency,
        status: SubscriberStatus.ACTIVE,
        verifiedAt,
        unsubscribeTokenHash: subscriber.unsubscribeTokenHash,
      },
    };
  }

  /**
   * Unauthenticated Capability Preference Lookup
   */
  async getPreferencesByToken(rawToken: string): Promise<{
    email: string;
    status: SubscriberStatus;
    topics: string[];
    frequency: DigestFrequency;
    verifiedAt: Date | null;
  }> {
    const tokenHash = this.hashToken(rawToken);
    const subscriber = await this.newsletterRepo.findSubscriberByUnsubscribeTokenHash(tokenHash);

    if (!subscriber) {
      throw new NotFoundException('Subscriber preference capability not found.');
    }

    return {
      email: this.maskEmail(subscriber.email),
      status: subscriber.status,
      topics: subscriber.topics,
      frequency: subscriber.frequency,
      verifiedAt: subscriber.verifiedAt,
    };
  }

  /**
   * Unauthenticated Capability Preference Update / Opt-out
   */
  async updatePreferencesByToken(
    rawToken: string,
    dto: UpdateSubscriberPreferencesDto,
  ): Promise<{
    message: string;
    status: SubscriberStatus;
    topics: string[];
    frequency: DigestFrequency;
  }> {
    const tokenHash = this.hashToken(rawToken);
    const subscriber = await this.newsletterRepo.findSubscriberByUnsubscribeTokenHash(tokenHash);

    if (!subscriber) {
      throw new NotFoundException('Subscriber preference capability not found.');
    }

    if (dto.unsubscribeAll) {
      await this.newsletterRepo.updateSubscriber(subscriber.id, {
        status: SubscriberStatus.UNSUBSCRIBED,
        unsubscribedAt: new Date(),
      });

      this.logger.log(`Subscriber [${this.maskEmail(subscriber.email)}] opted out of all broadcasts.`);

      return {
        message: 'You have been successfully unsubscribed from all Gazette communications.',
        status: SubscriberStatus.UNSUBSCRIBED,
        topics: subscriber.topics,
        frequency: subscriber.frequency,
      };
    }

    const updated = await this.newsletterRepo.updateSubscriber(subscriber.id, {
      topics: dto.topics !== undefined ? dto.topics : subscriber.topics,
      frequency: dto.frequency !== undefined ? dto.frequency : subscriber.frequency,
      status:
        subscriber.status === SubscriberStatus.UNSUBSCRIBED
          ? SubscriberStatus.ACTIVE
          : subscriber.status,
    });

    return {
      message: 'Your newsletter preferences have been updated.',
      status: updated?.status || subscriber.status,
      topics: updated?.topics || [],
      frequency: updated?.frequency || subscriber.frequency,
    };
  }

  /**
   * Webhook delivery / bounce / complaint handler
   */
  async handleWebhookEvent(event: {
    type: 'bounce' | 'complaint' | 'delivered';
    email: string;
    details?: string;
  }): Promise<{ recorded: boolean }> {
    const sub = await this.newsletterRepo.findSubscriberByEmail(event.email);
    if (!sub) return { recorded: false };

    if (event.type === 'bounce') {
      await this.newsletterRepo.updateSubscriber(sub.id, {
        status: SubscriberStatus.BOUNCED,
        bounceCount: (sub.bounceCount || 0) + 1,
        lastBouncedAt: new Date(),
      });
      this.logger.warn(`Recorded bounce event for [${this.maskEmail(event.email)}]`);
    } else if (event.type === 'complaint') {
      await this.newsletterRepo.updateSubscriber(sub.id, {
        status: SubscriberStatus.COMPLAINED,
        unsubscribedAt: new Date(),
      });
      this.logger.warn(`Recorded spam complaint for [${this.maskEmail(event.email)}]`);
    }

    return { recorded: true };
  }

  /**
   * Admin Campaign Management
   */
  async createCampaign(
    dto: CreateCampaignDto,
    authorId: string,
  ): Promise<NewsletterCampaign> {
    if (!dto.subject || !dto.contentHtml) {
      throw new BadRequestException('Subject and contentHtml are required.');
    }

    return await this.newsletterRepo.createCampaign({
      subject: dto.subject.trim(),
      previewText: dto.previewText?.trim() || '',
      contentHtml: sanitizeArticleContent(dto.contentHtml),
      targetTopics: dto.targetTopics || [],
      status: dto.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
      totalRecipients: 0,
      deliveredCount: 0,
      failedCount: 0,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      sentAt: null,
      authorId,
    });
  }

  /**
   * Trigger idempotent BullMQ batch broadcast
   */
  async sendCampaign(campaignId: string): Promise<{
    message: string;
    campaignId: string;
    totalRecipients: number;
    batchesEnqueued: number;
  }> {
    const campaign = await this.newsletterRepo.findCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign [${campaignId}] not found.`);
    }

    if (
      campaign.status === CampaignStatus.SENDING ||
      campaign.status === CampaignStatus.SENT
    ) {
      throw new BadRequestException(`Campaign is already in state [${campaign.status}].`);
    }

    // Query active recipients with suppression filtering
    const activeRecipients = await this.newsletterRepo.findActiveSubscribersForBroadcast(
      campaign.targetTopics,
    );

    if (activeRecipients.length === 0) {
      throw new BadRequestException('No active subscribers match the target topic criteria.');
    }

    // NL5: atomic compare-and-set DRAFT/SCHEDULED -> SENDING. Only the first
    // concurrent caller wins; losers get the null below instead of double-enqueue.
    const transitioned = await this.newsletterRepo.transitionCampaignStatus(
      campaignId,
      campaign.status,
      CampaignStatus.SENDING,
      {
        totalRecipients: activeRecipients.length,
        deliveredCount: 0,
        failedCount: 0,
        sentAt: new Date(),
      },
    );

    if (!transitioned) {
      throw new BadRequestException(
        `Campaign [${campaignId}] state changed concurrently; broadcast not started.`,
      );
    }

    // Partition into batches of 50
    const CHUNK_SIZE = 50;
    const totalBatches = Math.ceil(activeRecipients.length / CHUNK_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const chunk = activeRecipients.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const batchSubscribers = chunk.map((s) => ({
        id: s.id,
        email: s.email,
        unsubscribeTokenHash: s.unsubscribeTokenHash,
      }));

      await this.broadcastQueue.add(
        JOB_NAMES.DISPATCH_NEWSLETTER_BATCH,
        {
          campaignId: campaign.id,
          batchIndex: i,
          totalBatches,
          subject: campaign.subject,
          previewText: campaign.previewText,
          contentHtml: campaign.contentHtml,
          subscribers: batchSubscribers,
        },
        {
          jobId: `job_broadcast_${campaign.id}_batch_${i}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
        },
      );
    }

    this.logger.log(
      `Dispatched campaign [${campaignId}] to ${activeRecipients.length} recipients across ${totalBatches} BullMQ batches.`,
    );

    return {
      message: `Broadcast initiated for ${activeRecipients.length} subscribers across ${totalBatches} batches.`,
      campaignId,
      totalRecipients: activeRecipients.length,
      batchesEnqueued: totalBatches,
    };
  }

  async getSubscribers(filters: SubscriberQueryFilters) {
    return await this.newsletterRepo.findSubscribers(filters);
  }

  async getStats(): Promise<NewsletterStats> {
    return await this.newsletterRepo.getSubscriberStats();
  }

  async getCampaigns(limit?: number, page?: number) {
    return await this.newsletterRepo.findCampaigns(limit, page);
  }
}
