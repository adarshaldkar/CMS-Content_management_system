import { Test, TestingModule } from '@nestjs/testing';
import { PublisherWorker } from './publisher.worker';
import {
  ARTICLE_REPOSITORY,
  type IArticleRepository,
} from '../../repositories/interfaces/article.repository.interface';
import { AuditService } from '../audit/audit.service';
import { ContentStatus, type Article } from '../../domain/models';

describe('PublisherWorker (Scheduled Publishing Concurrency & Idempotency)', () => {
  let worker: PublisherWorker;

  const dueArticle: Article = {
    id: 'art-scheduled-1',
    title: 'Scheduled Release Article',
    slug: 'scheduled-release-article',
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
    scheduledAt: new Date(Date.now() - 5 * 60 * 1000), // Due 5 minutes ago!
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const futureArticle: Article = {
    ...dueArticle,
    id: 'art-future-2',
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // Future: 1 hour from now
  };

  const mockArticleRepo: Partial<IArticleRepository> = {
    findMany: jest.fn(),
    update: jest.fn(),
  };

  const mockAuditService: Partial<AuditService> = {
    log: jest.fn().mockResolvedValue({} as any),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublisherWorker,
        { provide: ARTICLE_REPOSITORY, useValue: mockArticleRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    worker = module.get<PublisherWorker>(PublisherWorker);
  });

  afterEach(() => {
    worker.onModuleDestroy();
  });

  it('should promote due scheduled articles to PUBLISHED and leave future articles untouched', async () => {
    (mockArticleRepo.findMany as jest.Mock).mockResolvedValue({
      items: [dueArticle, futureArticle],
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
    });

    (mockArticleRepo.update as jest.Mock).mockResolvedValue({
      ...dueArticle,
      status: ContentStatus.PUBLISHED,
    });

    const promoted = await worker.processDueArticles();

    expect(promoted).toBe(1);
    expect(mockArticleRepo.update).toHaveBeenCalledWith(
      'art-scheduled-1',
      expect.objectContaining({
        status: ContentStatus.PUBLISHED,
      }),
    );
    expect(mockArticleRepo.update).not.toHaveBeenCalledWith(
      'art-future-2',
      expect.anything(),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ARTICLE_STATUS_CHANGED',
        resource: 'Article:art-scheduled-1',
      }),
    );
  });

  it('should be idempotent and prevent race conditions if called concurrently', async () => {
    (mockArticleRepo.findMany as jest.Mock).mockResolvedValue({
      items: [dueArticle],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });

    (mockArticleRepo.update as jest.Mock).mockResolvedValue({
      ...dueArticle,
      status: ContentStatus.PUBLISHED,
    });

    // Run two worker cycles concurrently
    const [result1, result2] = await Promise.all([
      worker.processDueArticles(),
      worker.processDueArticles(),
    ]);

    // One of them processes the job, the other safely yields (lock prevents duplicate execution)
    expect(result1 + result2).toBe(1);
  });
});
