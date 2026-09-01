import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
import { PublishingSlotsService } from '../publishing-slots/publishing-slots.service';
import {
  ContentStatus,
  Permission,
  ROLE_PERMISSIONS,
  UserRole,
  type Article,
  type ArticleRevision,
  type AuthUser,
} from '../../domain/models';

describe('WorkflowService (Publishing State Machine, Revisions & Concurrency)', () => {
  let service: WorkflowService;

  const mockAuthor: AuthUser = {
    id: 'author-001',
    email: 'author@editorial.org',
    name: 'Arthur Author',
    role: UserRole.AUTHOR,
    permissions: ROLE_PERMISSIONS[UserRole.AUTHOR],
    isActive: true,
  };

  const mockEditor: AuthUser = {
    id: 'editor-001',
    email: 'editor@editorial.org',
    name: 'Emma Editor',
    role: UserRole.EDITOR,
    permissions: ROLE_PERMISSIONS[UserRole.EDITOR],
    isActive: true,
  };

  const mockArticle: Article = {
    id: 'art-001',
    title: 'The Principles of Journalism',
    slug: 'the-principles-of-journalism',
    description: 'An editorial on journalism',
    content: '<p>Body text...</p>',
    authorId: 'author-001',
    categoryId: 'cat-1',
    tagIds: [],
    coverImage: null,
    status: ContentStatus.DRAFT,
    version: 1,
    wordCount: 150,
    readingTimeMinutes: 1,
    seoTitle: 'Journalism Principles',
    seoDescription: 'SEO meta',
    reviewNote: null,
    scheduledAt: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockArticleRepo: Partial<IArticleRepository> = {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockRevisionRepo: Partial<IRevisionRepository> = {
    create: jest.fn(),
    findByArticleId: jest.fn(),
    findById: jest.fn(),
  };

  const mockAuditService: Partial<AuditService> = {
    log: jest.fn().mockResolvedValue({} as any),
  };

  const mockPublishingSlotsService: Partial<PublishingSlotsService> = {
    getAuthorClearance: jest.fn().mockResolvedValue({
      hasSlot: false,
      slot: null,
      assignment: null,
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: ARTICLE_REPOSITORY, useValue: mockArticleRepo },
        { provide: REVISION_REPOSITORY, useValue: mockRevisionRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: PublishingSlotsService, useValue: mockPublishingSlotsService },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
  });

  describe('createArticle', () => {
    it('should sanitize content, calculate metrics, and save Revision 1 snapshot', async () => {
      (mockArticleRepo.findBySlug as jest.Mock).mockResolvedValue(null);
      (mockArticleRepo.create as jest.Mock).mockResolvedValue(mockArticle);
      (mockRevisionRepo.create as jest.Mock).mockResolvedValue({} as ArticleRevision);

      const result = await service.createArticle(
        {
          title: 'The Principles of Journalism',
          slug: 'the-principles-of-journalism',
          description: 'An editorial on journalism',
          content: '<h2>Heading</h2><p>Safe content</p><script>alert(1)</script>',
          authorId: mockAuthor.id,
        },
        mockAuthor,
      );

      expect(mockArticleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '<h2>Heading</h2><p>Safe content</p>',
          status: ContentStatus.DRAFT,
        }),
      );
      expect(mockRevisionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 1,
          articleId: mockArticle.id,
        }),
      );
      expect(result.id).toBe(mockArticle.id);
    });
  });

  describe('Optimistic Concurrency Control', () => {
    it('should throw ConflictException (409) if expectedVersion does not match current version', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...mockArticle,
        version: 3,
      });

      await expect(
        service.updateArticle(
          'art-001',
          {
            title: 'Updated Title',
            expectedVersion: 2, // Stale version!
          },
          mockAuthor,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Workflow Authorization Matrix', () => {
    it('should allow Author to submit draft for review (DRAFT -> PENDING_REVIEW)', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue(mockArticle);
      (mockArticleRepo.update as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.PENDING_REVIEW,
        version: 2,
      });

      const result = await service.transitionState(
        'art-001',
        { targetStatus: ContentStatus.PENDING_REVIEW },
        mockAuthor,
      );

      expect(result.status).toBe(ContentStatus.PENDING_REVIEW);
      expect(mockRevisionRepo.create).toHaveBeenCalled();
    });

    it('should block Author from directly publishing a draft (DRAFT -> PUBLISHED throws Forbidden)', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue(mockArticle);

      await expect(
        service.transitionState(
          'art-001',
          { targetStatus: ContentStatus.PUBLISHED },
          mockAuthor, // Author lacks direct publish capability!
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should require a reviewNote when Editor rejects an article', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.PENDING_REVIEW,
      });

      await expect(
        service.transitionState(
          'art-001',
          { targetStatus: ContentStatus.REJECTED, reviewNote: '' }, // Missing note!
          mockEditor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow Editor to approve an article in PENDING_REVIEW (PENDING_REVIEW -> APPROVED)', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.PENDING_REVIEW,
      });
      (mockArticleRepo.update as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.APPROVED,
        version: 2,
      });

      const result = await service.transitionState(
        'art-001',
        { targetStatus: ContentStatus.APPROVED },
        mockEditor,
      );

      expect(result.status).toBe(ContentStatus.APPROVED);
    });

    it('should block Author from approving an article (throws Forbidden)', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.PENDING_REVIEW,
      });

      await expect(
        service.transitionState(
          'art-001',
          { targetStatus: ContentStatus.APPROVED },
          mockAuthor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Editor to publish an APPROVED article (APPROVED -> PUBLISHED)', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.APPROVED,
      });
      (mockArticleRepo.update as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
        version: 2,
      });

      const result = await service.transitionState(
        'art-001',
        { targetStatus: ContentStatus.PUBLISHED },
        mockEditor,
      );

      expect(result.status).toBe(ContentStatus.PUBLISHED);
      expect(mockArticleRepo.update).toHaveBeenCalledWith(
        'art-001',
        expect.objectContaining({
          status: ContentStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        }),
      );
    });

    it('should allow Editor to schedule an APPROVED article for a future date (APPROVED -> SCHEDULED)', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.APPROVED,
      });
      (mockArticleRepo.update as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.SCHEDULED,
        scheduledAt: new Date(futureDate),
        version: 2,
      });

      const result = await service.transitionState(
        'art-001',
        { targetStatus: ContentStatus.SCHEDULED, scheduledAt: futureDate },
        mockEditor,
      );

      expect(result.status).toBe(ContentStatus.SCHEDULED);
    });

    it('should allow Editor to archive a PUBLISHED article (PUBLISHED -> ARCHIVED)', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.PUBLISHED,
      });
      (mockArticleRepo.update as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.ARCHIVED,
        version: 2,
      });

      const result = await service.transitionState(
        'art-001',
        { targetStatus: ContentStatus.ARCHIVED },
        mockEditor,
      );

      expect(result.status).toBe(ContentStatus.ARCHIVED);
    });

    it('should block Author from archiving articles (throws Forbidden)', async () => {
      (mockArticleRepo.findById as jest.Mock).mockResolvedValue({
        ...mockArticle,
        status: ContentStatus.PUBLISHED,
      });

      await expect(
        service.transitionState(
          'art-001',
          { targetStatus: ContentStatus.ARCHIVED },
          mockAuthor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Revision Restoration', () => {
    it('should restore a previous revision by creating a brand NEW revision snapshot', async () => {
      const currentArticle = { ...mockArticle, version: 3 };
      const previousRevision: ArticleRevision = {
        id: 'rev-1',
        articleId: 'art-001',
        version: 1,
        title: 'Original Title v1',
        description: 'Original Desc',
        content: '<p>Original Content</p>',
        authorId: mockAuthor.id,
        changeSummary: 'Initial',
        createdAt: new Date(),
      };

      (mockArticleRepo.findById as jest.Mock).mockResolvedValue(currentArticle);
      (mockRevisionRepo.findById as jest.Mock).mockResolvedValue(previousRevision);
      (mockArticleRepo.update as jest.Mock).mockResolvedValue({
        ...currentArticle,
        title: previousRevision.title,
        content: previousRevision.content,
        version: 4, // Incremented!
      });

      const result = await service.restoreRevision('art-001', 'rev-1', mockAuthor);

      expect(result.version).toBe(4);
      expect(mockRevisionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          articleId: 'art-001',
          version: 4,
          title: 'Original Title v1',
          changeSummary: 'Restored from Revision v1',
        }),
      );
    });
  });
});
