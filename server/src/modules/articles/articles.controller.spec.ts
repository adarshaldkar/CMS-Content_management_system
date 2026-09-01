import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ArticlesController } from './articles.controller';
import { ArticleService } from './article.service';
import { WorkflowService } from './workflow.service';
import {
  ARTICLE_REPOSITORY,
  type IArticleRepository,
} from '../../repositories/interfaces/article.repository.interface';
import {
  REVISION_REPOSITORY,
  type IRevisionRepository,
} from '../../repositories/interfaces/revision.repository.interface';
import { AuditService } from '../audit/audit.service';
import {
  ContentStatus,
  UserRole,
  type Article,
  type AuthUser,
  type PaginatedResult,
} from '../../domain/models';

describe('ArticlesController & ArticleService', () => {
  let controller: ArticlesController;
  let service: ArticleService;
  let workflowService: WorkflowService;

  const mockArticle: Article = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'The Future of Editorial Publishing',
    slug: 'the-future-of-editorial-publishing',
    description: 'An in-depth look at secure CMS architecture',
    content: '<p>Content body...</p>',
    authorId: 'author-001',
    categoryId: 'cat-001',
    tagIds: ['tag-1', 'tag-2'],
    coverImage: 'https://images.example.com/cover.jpg',
    status: ContentStatus.PUBLISHED,
    version: 1,
    wordCount: 120,
    readingTimeMinutes: 1,
    seoTitle: 'Future of Publishing | CMS Platform',
    seoDescription: 'SEO metadata description',
    reviewNote: null,
    scheduledAt: null,
    publishedAt: new Date('2026-08-10T10:00:00Z'),
    createdAt: new Date('2026-08-10T09:00:00Z'),
    updatedAt: new Date('2026-08-10T09:30:00Z'),
    deletedAt: null,
  };

  const mockPaginatedResult: PaginatedResult<Article> = {
    items: [mockArticle],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockRepository: Partial<IArticleRepository> = {
    findMany: jest.fn().mockResolvedValue(mockPaginatedResult),
    findBySlug: jest.fn().mockImplementation((slug: string) => {
      if (slug === mockArticle.slug) {
        return Promise.resolve(mockArticle);
      }
      return Promise.resolve(null);
    }),
    findById: jest.fn().mockResolvedValue(mockArticle),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test_jwt_secret_min_32_chars_long!';
      if (key === 'CLIENT_URL') return 'http://localhost:5173';
      return null;
    }),
  };

  const mockWorkflowService = {
    createArticle: jest.fn().mockResolvedValue(mockArticle),
    updateArticle: jest.fn().mockResolvedValue(mockArticle),
    transitionState: jest.fn().mockResolvedValue(mockArticle),
    getRevisions: jest.fn().mockResolvedValue([]),
    restoreRevision: jest.fn().mockResolvedValue(mockArticle),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        ArticleService,
        {
          provide: ARTICLE_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WorkflowService,
          useValue: mockWorkflowService,
        },
      ],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
    service = module.get<ArticleService>(ArticleService);
    workflowService = module.get<WorkflowService>(WorkflowService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('GET /api/articles (list)', () => {
    it('should return paginated articles using default pagination (page=1, limit=20)', async () => {
      const result = await controller.list();

        expect(mockRepository.findMany).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          status: ContentStatus.PUBLISHED,
          search: undefined,
          authorId: undefined,
          categoryId: undefined,
          categorySlug: undefined,
          categorySlugs: undefined,
          tagSlugs: undefined,
          contentType: undefined,
          sortBy: 'latest',
          sortOrder: undefined,
          fromDate: undefined,
          toDate: undefined,
        });
      expect(result).toEqual(mockPaginatedResult);
      expect(result.items.length).toBe(1);
      expect(result.items[0].title).toBe('The Future of Editorial Publishing');
    });
  });

  describe('GET /api/articles/slug/:slug (getBySlug)', () => {
    it('should return the article when slug matches', async () => {
      const result = await controller.getBySlug('the-future-of-editorial-publishing');

      expect(mockRepository.findBySlug).toHaveBeenCalledWith('the-future-of-editorial-publishing');
      expect(result).toEqual(mockArticle);
      expect(result?.slug).toBe('the-future-of-editorial-publishing');
    });

    it('should return null when article does not exist', async () => {
      const result = await controller.getBySlug('non-existent-article-slug');

      expect(mockRepository.findBySlug).toHaveBeenCalledWith('non-existent-article-slug');
      expect(result).toBeNull();
    });
  });
});
