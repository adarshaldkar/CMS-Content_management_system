import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { COMMENT_REPOSITORY, type ICommentRepository } from '../../repositories/interfaces/comment.repository.interface';
import { ARTICLE_REPOSITORY, type IArticleRepository } from '../../repositories/interfaces/article.repository.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AuditEventType, type AuthUser, CommentStatus, type CreateCommentDto, NotificationType, type UpdateCommentDto } from '../../domain/models';
import sanitizeHtml from 'sanitize-html';

// Allow-list HTML sanitiser (reuses sanitize-html like article content)
function sanitizeCommentBody(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }
  return sanitizeHtml(raw, {
    allowedTags: ['strong', 'em', 'b', 'i', 'code', 'a', 'p', 'br'],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = (attribs.href || '').trim().toLowerCase();
        if (
          href.startsWith('javascript:') ||
          href.startsWith('vbscript:') ||
          href.startsWith('data:')
        ) {
          delete attribs.href;
        }
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        if (isExternal) {
          attribs.rel = attribs.rel
            ? `${attribs.rel} noopener noreferrer`.trim()
            : 'noopener noreferrer';
          attribs.target = attribs.target || '_blank';
        }
        return { tagName, attribs };
      },
    },
  }).trim();
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepo: ICommentRepository,
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getComments(articleId: string, page = 1, limit = 20) {
    return this.commentRepo.findMany({ articleId, page, limit });
  }

  async getUserComments(authorId: string, page = 1, limit = 20) {
    return this.commentRepo.findMany({ authorId, page, limit });
  }

  async createComment(articleId: string, dto: { body: string; parentId?: string }, actor: AuthUser) {
    const sanitized = sanitizeCommentBody(dto.body);
    if (!sanitized || sanitized.length < 1) {
      throw new BadRequestException('Comment body cannot be empty after sanitisation.');
    }
    if (sanitized.length > 2000) {
      throw new BadRequestException('Comment body exceeds maximum length of 2000 characters.');
    }

    const comment = await this.commentRepo.create({
      articleId,
      parentId: dto.parentId || null,
      authorId: actor.id,
      authorName: actor.name,
      authorAvatar: actor.avatarUrl || null,
      body: sanitized,
    });

    await this.auditService.log({
      actorId: actor.id,
      action: AuditEventType.COMMENT_CREATED,
      resource: `Comment:${comment.id}`,
      result: 'SUCCESS',
      metadata: { articleId },
    });

    // Asynchronously dispatch in-app notification
    this.dispatchCommentNotification(comment, articleId, dto.parentId, actor).catch((err) => {
      this.logger.warn(`Failed to dispatch comment notification: ${err.message}`);
    });

    return comment;
  }

  private async dispatchCommentNotification(
    comment: any,
    articleId: string,
    parentId?: string | null,
    actor?: AuthUser,
  ): Promise<void> {
    const article = await this.articleRepo.findById(articleId);
    if (!article || !actor) return;

    if (parentId) {
      // Threaded reply: notify parent comment author
      const parentComment = await this.commentRepo.findById(parentId);
      if (parentComment && parentComment.authorId !== actor.id) {
        await this.notificationsService.notify({
          userId: parentComment.authorId,
          actorId: actor.id,
          actorName: actor.name || actor.email || 'A Reader',
          actorAvatar: actor.avatarUrl || null,
          type: NotificationType.COMMENT_REPLY,
          title: 'New Reply to Your Comment',
          message: `${actor.name || 'A reader'} replied to your comment on "${article.title}".`,
          resourceType: 'comment',
          resourceId: comment.id,
          resourceSlug: article.slug,
        });
      }
    } else {
      // Top-level comment: notify article author
      if (article.authorId && article.authorId !== actor.id) {
        await this.notificationsService.notify({
          userId: article.authorId,
          actorId: actor.id,
          actorName: actor.name || actor.email || 'A Reader',
          actorAvatar: actor.avatarUrl || null,
          type: NotificationType.COMMENT_RECEIVED,
          title: 'New Discussion on Your Story',
          message: `${actor.name || 'A reader'} commented on "${article.title}".`,
          resourceType: 'comment',
          resourceId: comment.id,
          resourceSlug: article.slug,
        });
      }
    }
  }

  async updateComment(commentId: string, dto: UpdateCommentDto, actor: AuthUser) {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found.');

    // Only own comment or moderator
    const isModerator = actor.permissions.includes('comment.moderate' as any);
    if (comment.authorId !== actor.id && !isModerator) {
      throw new ForbiddenException('You can only edit your own comments.');
    }

    if (dto.body) {
      dto.body = sanitizeCommentBody(dto.body);
    }

    return this.commentRepo.update(commentId, dto);
  }

  async deleteComment(commentId: string, actor: AuthUser) {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found.');

    const isModerator = actor.permissions.includes('comment.moderate' as any);
    if (comment.authorId !== actor.id && !isModerator) {
      throw new ForbiddenException('You can only delete your own comments.');
    }

    await this.commentRepo.softDelete(commentId);
    await this.auditService.log({
      actorId: actor.id,
      action: AuditEventType.COMMENT_DELETED,
      resource: `Comment:${commentId}`,
      result: 'SUCCESS',
      metadata: { ownerId: comment.authorId },
    });
    return { success: true };
  }

  async hideComment(commentId: string, moderationNote: string, actor: AuthUser) {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found.');
    const updated = await this.commentRepo.update(commentId, {
      status: CommentStatus.HIDDEN,
      moderationNote,
    });
    await this.auditService.log({
      actorId: actor.id,
      action: AuditEventType.COMMENT_HIDDEN,
      resource: `Comment:${commentId}`,
      result: 'SUCCESS',
      metadata: { ownerId: comment.authorId, moderationNote },
    });
    return updated;
  }

  async countComments(articleId: string): Promise<number> {
    return this.commentRepo.countByArticle(articleId);
  }

  async listAllComments(filters: {
    page: number;
    limit: number;
    flagged?: boolean;
    hidden?: boolean;
    articleId?: string;
  }) {
    return this.commentRepo.findMany({
      page: filters.page,
      limit: filters.limit,
      ...(filters.flagged ? { status: CommentStatus.REPORTED } : {}),
      ...(filters.hidden ? { status: CommentStatus.HIDDEN } : {}),
      ...(filters.articleId ? { articleId: filters.articleId } : {}),
    });
  }
}
