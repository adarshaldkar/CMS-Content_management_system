import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { PublisherWorker } from './publisher.worker';
import {
  ARTICLE_REPOSITORY,
  type IArticleRepository,
} from '../../repositories/interfaces/article.repository.interface';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContentStatus, type Article } from '../../domain/models';
import { QUEUE_NAMES } from '../../bull/bull-queue.constants';

describe('PublisherWorker (BullMQ Scheduled Publishing & Idempotency)', () => {
  let worker: PublisherWorker;

  const scheduledArticle: Article = {
    id: 'art-scheduled-1',
    title: 'Scheduled Release Story',
    slug: 'scheduled-release-story',
    description: 'Excerpt...',
    content: '<p>Content</p>',
    authorId: 'author-1',
    categoryId: null,
    tagIds: [],
    coverImage: null,
    status: ContentStatus.SCHEDULED,
    version: 2,
    wordCount: 100,
    readingTimeMinutes: 1,
    seoTitle: null,
    seoDescription: null,
    reviewNote: null,
    scheduledAt: new Date(Date.now() - 5 * 60 * 1000),
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockArticleRepo: Partial<IArticleRepository> = {
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };

  const mockAuditService: Partial<AuditService> = {
    log: jest.fn().mockResolvedValue({} as any),
  };

  const mockRedisService: Partial<RedisService> = {
    delCached: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(0),
    isHealthy: jest.fn().mockReturnValue(true),
    acquireFencingLock: jest.fn().mockResolvedValue({ lockId: 'lock-1', fencingToken: 1 }),
    releaseFencingLock: jest.fn().mockResolvedValue(true),
  };

  const mockNotificationsService: Partial<NotificationsService> = {
    enqueue: jest.fn().mockResolvedValue({ queued: true, jobId: 'notif-1' }),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublisherWorker,
        { provide: ARTICLE_REPOSITORY, useValue: mockArticleRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: getQueueToken(QUEUE_NAMES.SCHEDULED_PUBLISHING), useValue: mockQueue },
      ],
    }).compile();

    worker = module.get<PublisherWorker>(PublisherWorker);
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  describe('process (BullMQ Job Processor)', () => {
    it('should promote scheduled article to PUBLISHED, invalidate cache, log audit, and notify author', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue(scheduledArticle);
      (mockArticleRepo.update as jest.Mock).mockResolvedValue({
        ...scheduledArticle,
        status: ContentStatus.PUBLISHED,
        version: 3,
      });

      const result = await worker.process({
        id: 'job-publish-1',
        data: {
          articleId: 'art-scheduled-1',
          version: 2,
          scheduledAt: new Date().toISOString(),
          enqueuedByUserId: 'author-1',
          enqueuedAt: new Date().toISOString(),
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.published).toBe(true);
      expect(mockArticleRepo.update).toHaveBeenCalledWith(
        'art-scheduled-1',
        expect.objectContaining({
          status: ContentStatus.PUBLISHED,
        }),
      );
      expect(mockRedisService.delCached).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should be idempotent: if already PUBLISHED, return clean No-Op without updating', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...scheduledArticle,
        status: ContentStatus.PUBLISHED,
      });

      const result = await worker.process({
        id: 'job-publish-1',
        data: {
          articleId: 'art-scheduled-1',
          version: 2,
          scheduledAt: new Date().toISOString(),
          enqueuedByUserId: 'author-1',
          enqueuedAt: new Date().toISOString(),
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.published).toBe(false);
      expect(result.reason).toBe('ALREADY_PUBLISHED');
      expect(mockArticleRepo.update).not.toHaveBeenCalled();
    });

    it('should discard stale job if version has incremented past job payload', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...scheduledArticle,
        version: 4, // Article was edited / rescheduled to higher version
      });

      const result = await worker.process({
        id: 'job-publish-old',
        data: {
          articleId: 'art-scheduled-1',
          version: 2, // Stale version
          scheduledAt: new Date().toISOString(),
          enqueuedByUserId: 'author-1',
          enqueuedAt: new Date().toISOString(),
        },
      } as any);

      expect(result.success).toBe(true);
      expect(result.published).toBe(false);
      expect(result.reason).toBe('STALE_VERSION');
      expect(mockArticleRepo.update).not.toHaveBeenCalled();
    });

    it('should reconcile overdue SCHEDULED articles when the periodic reconciler job fires', async () => {
      (mockArticleRepo.findMany as jest.Mock).mockResolvedValue({
        items: [scheduledArticle],
        total: 1,
      });
      (mockArticleRepo.update as jest.Mock).mockResolvedValue({
        ...scheduledArticle,
        status: ContentStatus.PUBLISHED,
      });

      const result = await worker.process({
        id: 'job-reconcile-1',
        name: 'reconcile-scheduled-publishers',
        data: {} as any,
      } as any);

      expect(result.reason).toBe('RECONCILED');
      expect(mockArticleRepo.findMany).toHaveBeenCalledWith({
        status: ContentStatus.SCHEDULED,
        limit: 100,
      });
      expect(mockArticleRepo.update).toHaveBeenCalledWith(
        'art-scheduled-1',
        expect.objectContaining({ status: ContentStatus.PUBLISHED }),
      );
    });
  });
});
