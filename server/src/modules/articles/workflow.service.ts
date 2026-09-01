import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
  AuditEventType,
  ContentStatus,
  Permission,
  UserRole,
  type Article,
  type ArticleRevision,
  type AuthUser,
  type CreateArticleDto,
  type UpdateArticleDto,
  type WorkflowTransitionDto,
} from '../../domain/models';
import {
  calculateReadingMetrics,
  sanitizeArticleContent,
} from '../../common/utils/sanitizer.util';
import { OwnershipHelper } from '../../common/guards/ownership.guard';
import { PublishingSlotsService } from '../publishing-slots/publishing-slots.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../domain/models';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
    @Inject(REVISION_REPOSITORY)
    private readonly revisionRepo: IRevisionRepository,
    private readonly auditService: AuditService,
    private readonly slotsService: PublishingSlotsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createArticle(
    dto: CreateArticleDto,
    user: AuthUser,
  ): Promise<Article> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('Article title is required.');
    }

    const sanitizedContent = sanitizeArticleContent(dto.content || '');
    const { wordCount, readingTimeMinutes } = calculateReadingMetrics(sanitizedContent);
    let slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.title);
    if (!slug) slug = `story-${Date.now()}`;

    // Check slug uniqueness; if already in use, automatically append a short unique suffix
    const existing = await this.articleRepo.findBySlug(slug);
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    const article = await this.articleRepo.create({
      ...dto,
      slug,
      content: sanitizedContent,
      authorId: user.id,
      status: ContentStatus.DRAFT,
      wordCount,
      readingTimeMinutes,
    });

    // Create Revision 1 snapshot
    await this.revisionRepo.create({
      articleId: article.id,
      version: 1,
      title: article.title,
      description: article.description,
      content: article.content,
      authorId: user.id,
      changeSummary: 'Initial draft created',
    });

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.ARTICLE_CREATED,
      resource: `Article:${article.id}`,
      result: 'SUCCESS',
      metadata: { title: article.title, status: article.status },
    });

    return article;
  }

  async updateArticle(
    id: string,
    dto: UpdateArticleDto,
    user: AuthUser,
  ): Promise<Article> {
    const article = await this.articleRepo.findById(id);
    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    // OWASP A01 Ownership check: Author can only edit own draft unless possessing article.update.any
    const canUpdateAny =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.EDITOR ||
      user.permissions.includes(Permission.ARTICLE_UPDATE_ANY);

    OwnershipHelper.verifyOwnership(user, article, canUpdateAny);

    // Optimistic Concurrency Control
    if (
      dto.expectedVersion !== undefined &&
      dto.expectedVersion !== article.version
    ) {
      throw new ConflictException(
        `Conflict: Article has been modified by another user (current version: ${article.version}, expected: ${dto.expectedVersion}). Please reload the latest version before saving.`,
      );
    }

    let sanitizedContent = article.content;
    let wordCount = article.wordCount;
    let readingTimeMinutes = article.readingTimeMinutes;

    if (dto.content !== undefined) {
      sanitizedContent = sanitizeArticleContent(dto.content);
      const metrics = calculateReadingMetrics(sanitizedContent);
      wordCount = metrics.wordCount;
      readingTimeMinutes = metrics.readingTimeMinutes;
    }

    let slug = article.slug;
    if (dto.slug && dto.slug !== article.slug) {
      slug = this.slugify(dto.slug);
      const existing = await this.articleRepo.findBySlug(slug);
      if (existing && existing.id !== article.id) {
        throw new ConflictException(`The slug "${slug}" is already in use.`);
      }
    }

    const nextVersion = article.version + 1;

    const updated = await this.articleRepo.update(id, {
      ...dto,
      slug,
      content: sanitizedContent,
      version: nextVersion,
      wordCount,
      readingTimeMinutes,
    });

    if (!updated) {
      throw new NotFoundException('Failed to update article.');
    }

    // Save immutable snapshot for this revision
    await this.revisionRepo.create({
      articleId: updated.id,
      version: nextVersion,
      title: updated.title,
      description: updated.description,
      content: updated.content,
      authorId: user.id,
      changeSummary: dto.changeSummary || 'Article content updated',
    });

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.ARTICLE_UPDATED,
      resource: `Article:${updated.id}`,
      result: 'SUCCESS',
      metadata: { version: nextVersion, title: updated.title },
    });

    return updated;
  }

  async transitionState(
    id: string,
    transitionDto: WorkflowTransitionDto,
    user: AuthUser,
  ): Promise<Article> {
    const article = await this.articleRepo.findById(id);
    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    // Optimistic concurrency check
    if (
      transitionDto.expectedVersion !== undefined &&
      transitionDto.expectedVersion !== article.version
    ) {
      throw new ConflictException(
        `Version conflict during workflow transition (current version: ${article.version}, expected: ${transitionDto.expectedVersion}).`,
      );
    }

    const currentStatus = article.status;
    const targetStatus = transitionDto.targetStatus;

    if (currentStatus === targetStatus) {
      return article;
    }

    // Validate Transition Rules & Invariants
    this.validateTransition(article, targetStatus, user, transitionDto);

    let finalTargetStatus = targetStatus;
    const updatePayload: UpdateArticleDto = {
      status: targetStatus,
      version: article.version + 1,
    };

    // If author submits for review, check if they have automated VIP Publishing Slot clearance
    if (targetStatus === ContentStatus.PENDING_REVIEW) {
      try {
        const clearance = await this.slotsService.getAuthorClearance(article.authorId);
        if (clearance.hasSlot && clearance.slot && clearance.assignment?.autoPublishEnabled && clearance.slot.isActive) {
          const scheduledDate = clearance.nextEstimatedPublishAt ? new Date(clearance.nextEstimatedPublishAt) : new Date(Date.now() + 3600000);
          finalTargetStatus = ContentStatus.SCHEDULED;
          updatePayload.status = ContentStatus.SCHEDULED;
          updatePayload.scheduledAt = scheduledDate;
          updatePayload.publishingSlotId = clearance.slot.id;
        }
      } catch {
        // Fallback to standard review queue
      }
    }

    if (finalTargetStatus === ContentStatus.PUBLISHED) {
      updatePayload.publishedAt = new Date();
      updatePayload.scheduledAt = null;
    } else if (finalTargetStatus === ContentStatus.SCHEDULED && targetStatus === ContentStatus.SCHEDULED) {
      if (!transitionDto.scheduledAt) {
        throw new BadRequestException('A scheduled date is required to schedule an article.');
      }
      const scheduledDate = new Date(transitionDto.scheduledAt);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        throw new BadRequestException('Scheduled date must be in the future.');
      }
      updatePayload.scheduledAt = scheduledDate;
    } else if (finalTargetStatus === ContentStatus.REJECTED) {
      if (!transitionDto.reviewNote || transitionDto.reviewNote.trim().length === 0) {
        throw new BadRequestException('A review feedback note is required when rejecting an article.');
      }
      updatePayload.reviewNote = transitionDto.reviewNote.trim();
    }

    const updated = await this.articleRepo.update(id, updatePayload);
    if (!updated) {
      throw new NotFoundException('Failed to update article status.');
    }

    // Record revision on submit, schedule, or restore
    if (
      finalTargetStatus === ContentStatus.PENDING_REVIEW ||
      finalTargetStatus === ContentStatus.SCHEDULED ||
      finalTargetStatus === ContentStatus.DRAFT
    ) {
      await this.revisionRepo.create({
        articleId: updated.id,
        version: updated.version,
        title: updated.title,
        description: updated.description,
        content: updated.content,
        authorId: user.id,
        changeSummary: `State transitioned from ${currentStatus} to ${finalTargetStatus}${updatePayload.publishingSlotId ? ' (Auto-Enqueued into Publishing Slot)' : ''}`,
      });
    }

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.ARTICLE_STATUS_CHANGED,
      resource: `Article:${updated.id}`,
      result: 'SUCCESS',
      metadata: {
        from: currentStatus,
        to: finalTargetStatus,
        publishingSlotId: updatePayload.publishingSlotId || null,
        scheduledAt: updatePayload.scheduledAt || null,
        reviewNote: transitionDto.reviewNote,
      },
    });

    // Dispatch in-app notification to author
    if (updated.authorId && updated.authorId !== user.id) {
      let notifType: NotificationType | null = null;
      let title = '';
      let message = '';

      if (finalTargetStatus === ContentStatus.PUBLISHED) {
        notifType = NotificationType.ARTICLE_PUBLISHED;
        title = 'Story Published';
        message = `Your manuscript "${updated.title}" has been approved and published to the Front Page.`;
      } else if (finalTargetStatus === ContentStatus.REJECTED) {
        notifType = NotificationType.ARTICLE_REJECTED;
        title = 'Editorial Decision';
        message = `The editorial desk requested revisions on "${updated.title}": ${transitionDto.reviewNote || 'Please review feedback.'}`;
      } else if (finalTargetStatus === ContentStatus.APPROVED) {
        notifType = NotificationType.ARTICLE_FEEDBACK;
        title = 'Editorial Approval';
        message = `Your manuscript "${updated.title}" was approved by the editorial desk.`;
      } else if (finalTargetStatus === ContentStatus.SCHEDULED) {
        notifType = NotificationType.ARTICLE_SCHEDULED;
        title = 'Story Scheduled';
        message = `Your manuscript "${updated.title}" has been scheduled for publication.`;
      }

      if (notifType) {
        this.notificationsService
          .notify({
            userId: updated.authorId,
            actorId: user.id,
            actorName: user.name || user.email || 'Editorial Desk',
            type: notifType,
            title,
            message,
            resourceType: 'article',
            resourceId: updated.id,
            resourceSlug: updated.slug,
          })
          .catch((err) => {
            this.logger.warn(`Failed to dispatch workflow notification: ${err.message}`);
          });
      }
    }

    return updated;
  }

  private validateTransition(
    article: Article,
    target: ContentStatus,
    user: AuthUser,
    dto: WorkflowTransitionDto,
  ): void {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const isEditorOrAdmin =
      isSuperAdmin ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.EDITOR;

    switch (article.status) {
      case ContentStatus.DRAFT:
        if (target === ContentStatus.PENDING_REVIEW) {
          // Author or Editor can submit for review
          if (!user.permissions.includes(Permission.ARTICLE_SUBMIT_REVIEW)) {
            throw new ForbiddenException('Missing permission: article.submit_review');
          }
          if (!article.title || !article.content) {
            throw new BadRequestException('Article title and content cannot be empty for review submission.');
          }
          return;
        }
        if (target === ContentStatus.PUBLISHED || target === ContentStatus.APPROVED) {
          // Authors CANNOT publish drafts directly
          if (!isEditorOrAdmin || !user.permissions.includes(Permission.ARTICLE_PUBLISH)) {
            throw new ForbiddenException('Authors cannot self-publish drafts directly. Please submit for editorial review.');
          }
          return;
        }
        break;

      case ContentStatus.PENDING_REVIEW:
        if (target === ContentStatus.DRAFT) {
          if (article.authorId === user.id || isEditorOrAdmin) {
            return;
          }
          throw new ForbiddenException('Cannot withdraw manuscript.');
        }
        if (target === ContentStatus.APPROVED) {
          if (!user.permissions.includes(Permission.ARTICLE_APPROVE)) {
            throw new ForbiddenException('Missing capability: article.approve');
          }
          return;
        }
        if (target === ContentStatus.PUBLISHED) {
          if (!isEditorOrAdmin || !user.permissions.includes(Permission.ARTICLE_PUBLISH)) {
            throw new ForbiddenException('Missing capability: article.publish');
          }
          return;
        }
        if (target === ContentStatus.SCHEDULED) {
          if (!isEditorOrAdmin || !user.permissions.includes(Permission.ARTICLE_SCHEDULE)) {
            throw new ForbiddenException('Missing capability: article.schedule');
          }
          return;
        }
        if (target === ContentStatus.REJECTED) {
          if (!user.permissions.includes(Permission.ARTICLE_REJECT)) {
            throw new ForbiddenException('Missing capability: article.reject');
          }
          return;
        }
        break;

      case ContentStatus.APPROVED:
        if (target === ContentStatus.PUBLISHED) {
          if (!user.permissions.includes(Permission.ARTICLE_PUBLISH)) {
            throw new ForbiddenException('Missing capability: article.publish');
          }
          return;
        }
        if (target === ContentStatus.SCHEDULED) {
          if (!user.permissions.includes(Permission.ARTICLE_SCHEDULE)) {
            throw new ForbiddenException('Missing capability: article.schedule');
          }
          return;
        }
        break;

      case ContentStatus.REJECTED:
        if (target === ContentStatus.DRAFT) {
          // Author edits rejected article to draft
          return;
        }
        break;

      case ContentStatus.PUBLISHED:
        if (target === ContentStatus.ARCHIVED) {
          if (!user.permissions.includes(Permission.ARTICLE_ARCHIVE)) {
            throw new ForbiddenException('Missing capability: article.archive');
          }
          return;
        }
        break;

      case ContentStatus.ARCHIVED:
        if (target === ContentStatus.DRAFT) {
          if (!user.permissions.includes(Permission.ARTICLE_RESTORE)) {
            throw new ForbiddenException('Missing capability: article.restore');
          }
          return;
        }
        break;
    }

    throw new BadRequestException(
      `Illegal workflow transition: Cannot move article from ${article.status} to ${target}.`,
    );
  }

  async getRevisions(articleId: string, user: AuthUser): Promise<ArticleRevision[]> {
    const article = await this.articleRepo.findById(articleId);
    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    const canReadAny =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.EDITOR ||
      user.permissions.includes(Permission.ARTICLE_READ_ANY);

    OwnershipHelper.verifyOwnership(user, article, canReadAny);

    return this.revisionRepo.findByArticleId(articleId);
  }

  async restoreRevision(
    articleId: string,
    revisionId: string,
    user: AuthUser,
  ): Promise<Article> {
    const article = await this.articleRepo.findById(articleId);
    if (!article) {
      throw new NotFoundException('Article not found.');
    }

    const canUpdateAny =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.EDITOR ||
      user.permissions.includes(Permission.ARTICLE_UPDATE_ANY);

    OwnershipHelper.verifyOwnership(user, article, canUpdateAny);

    const revision = await this.revisionRepo.findById(revisionId);
    if (!revision || revision.articleId !== articleId) {
      throw new NotFoundException('Revision snapshot not found.');
    }

    // Creating a NEW revision upon restoration to maintain immutable history
    const nextVersion = article.version + 1;
    const sanitized = sanitizeArticleContent(revision.content);
    const { wordCount, readingTimeMinutes } = calculateReadingMetrics(sanitized);

    const updated = await this.articleRepo.update(articleId, {
      title: revision.title,
      description: revision.description,
      content: sanitized,
      version: nextVersion,
      wordCount,
      readingTimeMinutes,
    });

    if (!updated) {
      throw new NotFoundException('Failed to restore revision.');
    }

    await this.revisionRepo.create({
      articleId: updated.id,
      version: nextVersion,
      title: updated.title,
      description: updated.description,
      content: updated.content,
      authorId: user.id,
      changeSummary: `Restored from Revision v${revision.version}`,
    });

    return updated;
  }
}
