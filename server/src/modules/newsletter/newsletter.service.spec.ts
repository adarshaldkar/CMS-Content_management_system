import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import * as crypto from 'crypto';
import { NewsletterService } from './newsletter.service';
import { NEWSLETTER_REPOSITORY } from '../../repositories/interfaces/newsletter.repository.interface';
import { QUEUE_NAMES, JOB_NAMES } from '../../bull/bull-queue.constants';
import {
  SubscriberStatus,
  CampaignStatus,
  DigestFrequency,
  type NewsletterSubscriber,
  type NewsletterCampaign,
} from '../../domain/models';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let mockNewsletterRepo: any;
  let mockBroadcastQueue: any;

  const mockSubscribers: NewsletterSubscriber[] = [];
  const mockCampaigns: NewsletterCampaign[] = [];

  beforeEach(async () => {
    mockSubscribers.length = 0;
    mockCampaigns.length = 0;

    mockNewsletterRepo = {
      findSubscriberByEmail: jest.fn(async (email: string) => {
        return mockSubscribers.find((s) => s.email.toLowerCase() === email.toLowerCase()) || null;
      }),
      findSubscriberById: jest.fn(async (id: string) => {
        return mockSubscribers.find((s) => s.id === id) || null;
      }),
      findSubscriberByVerifyTokenHash: jest.fn(async (hash: string) => {
        return mockSubscribers.find((s) => s.verificationTokenHash === hash) || null;
      }),
      findSubscriberByUnsubscribeTokenHash: jest.fn(async (hash: string) => {
        return mockSubscribers.find((s) => s.unsubscribeTokenHash === hash) || null;
      }),
      createSubscriber: jest.fn(async (sub: any) => {
        const created: NewsletterSubscriber = {
          id: `sub-${mockSubscribers.length + 1}`,
          ...sub,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSubscribers.push(created);
        return created;
      }),
      updateSubscriber: jest.fn(async (id: string, updates: any) => {
        const idx = mockSubscribers.findIndex((s) => s.id === id);
        if (idx === -1) return null;
        mockSubscribers[idx] = {
          ...mockSubscribers[idx],
          ...updates,
          updatedAt: new Date(),
        };
        return mockSubscribers[idx];
      }),
      findSubscribers: jest.fn(async () => ({
        items: mockSubscribers,
        total: mockSubscribers.length,
        page: 1,
        totalPages: 1,
      })),
      findActiveSubscribersForBroadcast: jest.fn(async () => {
        return mockSubscribers.filter((s) => s.status === SubscriberStatus.ACTIVE);
      }),
      getSubscriberStats: jest.fn(async () => ({
        totalSubscribers: mockSubscribers.length,
        activeSubscribers: mockSubscribers.filter((s) => s.status === SubscriberStatus.ACTIVE).length,
        pendingVerification: mockSubscribers.filter((s) => s.status === SubscriberStatus.PENDING_VERIFICATION).length,
        unsubscribed: mockSubscribers.filter((s) => s.status === SubscriberStatus.UNSUBSCRIBED).length,
        bounced: mockSubscribers.filter((s) => s.status === SubscriberStatus.BOUNCED).length,
        totalCampaignsSent: mockCampaigns.filter((c) => c.status === CampaignStatus.SENT).length,
      })),
      createCampaign: jest.fn(async (c: any) => {
        const created: NewsletterCampaign = {
          id: `camp-${mockCampaigns.length + 1}`,
          ...c,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockCampaigns.push(created);
        return created;
      }),
      findCampaignById: jest.fn(async (id: string) => {
        return mockCampaigns.find((c) => c.id === id) || null;
      }),
      updateCampaign: jest.fn(async (id: string, updates: any) => {
        const idx = mockCampaigns.findIndex((c) => c.id === id);
        if (idx === -1) return null;
        mockCampaigns[idx] = {
          ...mockCampaigns[idx],
          ...updates,
          updatedAt: new Date(),
        };
        return mockCampaigns[idx];
      }),
      findCampaigns: jest.fn(async () => ({
        items: mockCampaigns,
        total: mockCampaigns.length,
        page: 1,
        totalPages: 1,
      })),
    };

    mockBroadcastQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        {
          provide: NEWSLETTER_REPOSITORY,
          useValue: mockNewsletterRepo,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.NEWSLETTER_BROADCAST),
          useValue: mockBroadcastQueue,
        },
      ],
    }).compile();

    service = module.get<NewsletterService>(NewsletterService);
  });

  describe('subscribe', () => {
    it('should create a new subscriber in PENDING_VERIFICATION state with SHA-256 token hash', async () => {
      const result = await service.subscribe({
        email: 'reader@example.com',
        topics: ['technology', 'politics'],
      });

      expect(result.status).toBe(SubscriberStatus.PENDING_VERIFICATION);
      expect(result.isAlreadySubscribed).toBe(false);
      expect(result.verificationToken).toBeDefined();

      expect(mockNewsletterRepo.createSubscriber).toHaveBeenCalledTimes(1);
      const createdArg = mockNewsletterRepo.createSubscriber.mock.calls[0][0];
      expect(createdArg.email).toBe('reader@example.com');
      expect(createdArg.status).toBe(SubscriberStatus.PENDING_VERIFICATION);
      expect(createdArg.verificationTokenHash).toBeDefined();
      // Verify SHA-256 hash
      const expectedHash = crypto.createHash('sha256').update(result.verificationToken!).digest('hex');
      expect(createdArg.verificationTokenHash).toBe(expectedHash);

      // Verify BullMQ job enqueued
      expect(mockBroadcastQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.DISPATCH_NEWSLETTER_VERIFICATION,
        expect.objectContaining({
          email: 'reader@example.com',
          rawToken: result.verificationToken,
        }),
        expect.any(Object),
      );
    });

    it('should reject invalid emails', async () => {
      await expect(service.subscribe({ email: 'invalid-email' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return already subscribed if subscriber is ACTIVE', async () => {
      mockSubscribers.push({
        id: 'sub-active',
        email: 'active@example.com',
        status: SubscriberStatus.ACTIVE,
        topics: [],
        frequency: DigestFrequency.DAILY,
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
        unsubscribeTokenHash: 'unsub-hash',
        bounceCount: 0,
        verifiedAt: new Date(),
        unsubscribedAt: null,
        lastBouncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.subscribe({ email: 'active@example.com' });
      expect(result.isAlreadySubscribed).toBe(true);
      expect(result.status).toBe(SubscriberStatus.ACTIVE);
      expect(mockBroadcastQueue.add).not.toHaveBeenCalled();
    });

    it('should rotate verification token for an existing pending subscriber', async () => {
      mockSubscribers.push({
        id: 'sub-pending',
        email: 'pending@example.com',
        status: SubscriberStatus.PENDING_VERIFICATION,
        topics: [],
        frequency: DigestFrequency.DAILY,
        verificationTokenHash: 'old-hash',
        verificationTokenExpiresAt: new Date(Date.now() - 1000),
        unsubscribeTokenHash: 'unsub-hash',
        bounceCount: 0,
        verifiedAt: null,
        unsubscribedAt: null,
        lastBouncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.subscribe({ email: 'pending@example.com' });
      expect(result.status).toBe(SubscriberStatus.PENDING_VERIFICATION);
      expect(mockNewsletterRepo.updateSubscriber).toHaveBeenCalledWith(
        'sub-pending',
        expect.objectContaining({
          status: SubscriberStatus.PENDING_VERIFICATION,
        }),
      );
    });
  });

  describe('verify', () => {
    it('should activate subscriber with matching SHA-256 token hash', async () => {
      const rawToken = '1234567890abcdef1234567890abcdef1234567890abcdef';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockSubscribers.push({
        id: 'sub-to-verify',
        email: 'verify@example.com',
        status: SubscriberStatus.PENDING_VERIFICATION,
        topics: ['tech'],
        frequency: DigestFrequency.DAILY,
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: new Date(Date.now() + 100000),
        unsubscribeTokenHash: 'unsub-hash',
        bounceCount: 0,
        verifiedAt: null,
        unsubscribedAt: null,
        lastBouncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.verify(rawToken);
      expect(result.subscriber.status).toBe(SubscriberStatus.ACTIVE);
      expect(result.subscriber.verifiedAt).toBeDefined();
      expect(mockNewsletterRepo.updateSubscriber).toHaveBeenCalledWith(
        'sub-to-verify',
        expect.objectContaining({
          status: SubscriberStatus.ACTIVE,
          verificationTokenHash: null,
        }),
      );
    });

    it('should throw BadRequestException for expired verification tokens', async () => {
      const rawToken = '1234567890abcdef1234567890abcdef1234567890abcdef';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockSubscribers.push({
        id: 'sub-expired',
        email: 'expired@example.com',
        status: SubscriberStatus.PENDING_VERIFICATION,
        topics: [],
        frequency: DigestFrequency.DAILY,
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: new Date(Date.now() - 5000), // expired
        unsubscribeTokenHash: 'unsub-hash',
        bounceCount: 0,
        verifiedAt: null,
        unsubscribedAt: null,
        lastBouncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.verify(rawToken)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePreferencesByToken', () => {
    it('should unsubscribe subscriber when unsubscribeAll is true', async () => {
      const rawUnsubToken = 'unsub-token-12345678901234567890123456789012';
      const unsubHash = crypto.createHash('sha256').update(rawUnsubToken).digest('hex');

      mockSubscribers.push({
        id: 'sub-active',
        email: 'reader@example.com',
        status: SubscriberStatus.ACTIVE,
        topics: ['news'],
        frequency: DigestFrequency.DAILY,
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
        unsubscribeTokenHash: unsubHash,
        bounceCount: 0,
        verifiedAt: new Date(),
        unsubscribedAt: null,
        lastBouncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updatePreferencesByToken(rawUnsubToken, {
        unsubscribeAll: true,
      });

      expect(result.status).toBe(SubscriberStatus.UNSUBSCRIBED);
      expect(mockNewsletterRepo.updateSubscriber).toHaveBeenCalledWith(
        'sub-active',
        expect.objectContaining({
          status: SubscriberStatus.UNSUBSCRIBED,
        }),
      );
    });
  });

  describe('sendCampaign', () => {
    it('should query active recipients and enqueue partitioned BullMQ batches with idempotency keys', async () => {
      mockSubscribers.push(
        {
          id: 'sub-1',
          email: 'sub1@example.com',
          status: SubscriberStatus.ACTIVE,
          topics: ['tech'],
          frequency: DigestFrequency.DAILY,
          verificationTokenHash: null,
          verificationTokenExpiresAt: null,
          unsubscribeTokenHash: 'hash-1',
          bounceCount: 0,
          verifiedAt: new Date(),
          unsubscribedAt: null,
          lastBouncedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sub-2',
          email: 'sub2@example.com',
          status: SubscriberStatus.ACTIVE,
          topics: ['tech'],
          frequency: DigestFrequency.DAILY,
          verificationTokenHash: null,
          verificationTokenExpiresAt: null,
          unsubscribeTokenHash: 'hash-2',
          bounceCount: 0,
          verifiedAt: new Date(),
          unsubscribedAt: null,
          lastBouncedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );

      const campaign = await service.createCampaign(
        {
          subject: 'Weekly Gazette Tech Brief',
          contentHtml: '<p>The latest updates.</p>',
          targetTopics: ['tech'],
        },
        'author-1',
      );

      const sendResult = await service.sendCampaign(campaign.id);
      expect(sendResult.totalRecipients).toBe(2);
      expect(sendResult.batchesEnqueued).toBe(1);

      expect(mockBroadcastQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.DISPATCH_NEWSLETTER_BATCH,
        expect.objectContaining({
          campaignId: campaign.id,
          batchIndex: 0,
          subject: 'Weekly Gazette Tech Brief',
        }),
        expect.objectContaining({
          jobId: `job_broadcast_${campaign.id}_batch_0`,
        }),
      );
    });
  });

  describe('handleWebhookEvent', () => {
    it('should increment bounce count and mark status as BOUNCED', async () => {
      mockSubscribers.push({
        id: 'sub-bouncing',
        email: 'bounce@example.com',
        status: SubscriberStatus.ACTIVE,
        topics: [],
        frequency: DigestFrequency.DAILY,
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
        unsubscribeTokenHash: 'unsub-hash',
        bounceCount: 0,
        verifiedAt: new Date(),
        unsubscribedAt: null,
        lastBouncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.handleWebhookEvent({
        type: 'bounce',
        email: 'bounce@example.com',
      });

      expect(mockNewsletterRepo.updateSubscriber).toHaveBeenCalledWith(
        'sub-bouncing',
        expect.objectContaining({
          status: SubscriberStatus.BOUNCED,
          bounceCount: 1,
        }),
      );
    });
  });
});
