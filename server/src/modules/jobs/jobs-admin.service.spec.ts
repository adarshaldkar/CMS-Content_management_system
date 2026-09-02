import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { JobsAdminService } from './jobs-admin.service';
import { QUEUE_NAMES } from '../../bull/bull-queue.constants';

describe('JobsAdminService', () => {
  let service: JobsAdminService;

  const mockJob = {
    id: 'job-123',
    name: 'publish-scheduled-article',
    progress: 50,
    attemptsMade: 2,
    failedReason: 'DB connection timeout',
    timestamp: Date.now() - 60000,
    processedOn: Date.now() - 30000,
    finishedOn: null,
    opts: { delay: 0, priority: 1, authToken: 'super-secret-jwt-token' },
    data: {
      articleId: 'art-1',
      authorPasswordHash: 'secret-hash-1234',
      version: 2,
    },
    stacktrace: [
      'Error: Connection failed\n    at C:\\Users\\shrut\\Desktop\\CMS Project\\server\\src\\database\\postgres.service.ts:45:10',
    ],
    getState: jest.fn().mockResolvedValue('failed'),
    retry: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const createMockQueue = (name: string) => ({
    name,
    getJobCounts: jest.fn().mockResolvedValue({
      active: 1,
      waiting: 2,
      delayed: 3,
      failed: 4,
      completed: 10,
      paused: 0,
    }),
    isPaused: jest.fn().mockResolvedValue(false),
    getWaiting: jest.fn().mockResolvedValue([{ timestamp: Date.now() - 120000 }]),
    getFailed: jest.fn().mockResolvedValue([mockJob]),
    getActive: jest.fn().mockResolvedValue([mockJob]),
    getDelayed: jest.fn().mockResolvedValue([mockJob]),
    getCompleted: jest.fn().mockResolvedValue([mockJob]),
    getFailedCount: jest.fn().mockResolvedValue(4),
    getActiveCount: jest.fn().mockResolvedValue(1),
    getWaitingCount: jest.fn().mockResolvedValue(2),
    getDelayedCount: jest.fn().mockResolvedValue(3),
    getCompletedCount: jest.fn().mockResolvedValue(10),
    getJob: jest.fn().mockImplementation((id: string) => {
      if (id === 'job-123') return Promise.resolve(mockJob);
      return Promise.resolve(null);
    }),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    clean: jest.fn().mockResolvedValue(['job-1', 'job-2']),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsAdminService,
        {
          provide: getQueueToken(QUEUE_NAMES.SCHEDULED_PUBLISHING),
          useValue: createMockQueue(QUEUE_NAMES.SCHEDULED_PUBLISHING),
        },
        {
          provide: getQueueToken(QUEUE_NAMES.NOTIFICATION_OUTBOX),
          useValue: createMockQueue(QUEUE_NAMES.NOTIFICATION_OUTBOX),
        },
        {
          provide: getQueueToken(QUEUE_NAMES.MESH_RECONCILIATION),
          useValue: createMockQueue(QUEUE_NAMES.MESH_RECONCILIATION),
        },
        {
          provide: getQueueToken(QUEUE_NAMES.ANALYTICS_ROLLUP),
          useValue: createMockQueue(QUEUE_NAMES.ANALYTICS_ROLLUP),
        },
      ],
    }).compile();

    service = module.get<JobsAdminService>(JobsAdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getQueueSummaries', () => {
    it('should aggregate metrics across all 4 queues with oldest waiting age and DLQ counts', async () => {
      const summaries = await service.getQueueSummaries();

      expect(summaries).toHaveLength(4);
      const publishingQueue = summaries.find(
        (s) => s.queueName === QUEUE_NAMES.SCHEDULED_PUBLISHING,
      );
      expect(publishingQueue).toBeDefined();
      expect(publishingQueue?.counts.active).toBe(1);
      expect(publishingQueue?.counts.failed).toBe(4);
      expect(publishingQueue?.metrics.dlqSize).toBe(4);
      expect(publishingQueue?.metrics.oldestWaitingJobAgeMs).toBeGreaterThan(0);
      expect(publishingQueue?.isPaused).toBe(false);
    });
  });

  describe('getJobs', () => {
    it('should return paginated list of jobs for requested queue and state', async () => {
      const result = await service.getJobs(
        QUEUE_NAMES.SCHEDULED_PUBLISHING,
        'failed',
        1,
        10,
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('job-123');
      expect(result.total).toBe(4);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getJobDetail with Sanitization', () => {
    it('should redact sensitive tokens and sanitize system drive paths from stacktrace', async () => {
      const detail = await service.getJobDetail(
        QUEUE_NAMES.SCHEDULED_PUBLISHING,
        'job-123',
      );

      expect(detail.id).toBe('job-123');
      expect(detail.name).toBe('publish-scheduled-article');

      // Verify payload redaction
      expect(detail.data.authorPasswordHash).toBe('[REDACTED]');
      expect(detail.opts.authToken).toBe('[REDACTED]');
      expect(detail.data.articleId).toBe('art-1'); // Safe field preserved

      // Verify stacktrace path sanitization
      expect(detail.stacktrace[0]).toContain('server\\src\\database\\postgres.service.ts');
      expect(detail.stacktrace[0]).not.toContain('C:\\Users\\shrut\\Desktop');
    });

    it('should throw NotFoundException if job does not exist', async () => {
      await expect(
        service.getJobDetail(QUEUE_NAMES.SCHEDULED_PUBLISHING, 'non-existent'),
      ).rejects.toThrow('Job "non-existent" not found');
    });
  });

  describe('retryJob & retryAllFailed', () => {
    it('should retry single failed job in DLQ', async () => {
      const res = await service.retryJob(
        QUEUE_NAMES.SCHEDULED_PUBLISHING,
        'job-123',
      );
      expect(res.success).toBe(true);
      expect(res.jobId).toBe('job-123');
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should bulk retry all failed jobs in DLQ', async () => {
      const res = await service.retryAllFailed(
        QUEUE_NAMES.SCHEDULED_PUBLISHING,
      );
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
    });
  });

  describe('Queue Lifecycle (Pause, Resume, Clean, Remove)', () => {
    it('should pause and resume queue', async () => {
      const pauseRes = await service.pauseQueue(
        QUEUE_NAMES.SCHEDULED_PUBLISHING,
      );
      expect(pauseRes.paused).toBe(true);

      const resumeRes = await service.resumeQueue(
        QUEUE_NAMES.SCHEDULED_PUBLISHING,
      );
      expect(resumeRes.paused).toBe(false);
    });

    it('should clean old jobs from queue', async () => {
      const cleanRes = await service.cleanQueue(
        QUEUE_NAMES.SCHEDULED_PUBLISHING,
        { gracePeriodMs: 3600000, status: 'completed' },
      );
      expect(cleanRes.removedCount).toBe(2);
    });

    it('should remove specific job', async () => {
      const removeRes = await service.removeJob(
        QUEUE_NAMES.SCHEDULED_PUBLISHING,
        'job-123',
      );
      expect(removeRes.success).toBe(true);
      expect(mockJob.remove).toHaveBeenCalled();
    });
  });
});
