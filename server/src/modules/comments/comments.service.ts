import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { COMMENT_REPOSITORY, type ICommentRepository } from '../../repositories/interfaces/comment.repository.interface';
import { AuditService } from '../audit/audit.service';
import { AuditEventType, type AuthUser, CommentStatus, type CreateCommentDto, type UpdateCommentDto } from '../../domain/models';

// Simple allow-list HTML sanitiser (strips all tags except safe inline ones)
function sanitizeCommentBody(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(?!\/?(strong|em|b|i|code|a)[^>]*>)[^>]+>/gi, '')
    .trim();
}

@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepo: ICommentRepository,
    private readonly auditService: AuditService,
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

    return comment;
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
    return this.commentRepo.update(commentId, {
      status: CommentStatus.HIDDEN,
      moderationNote,
    });
  }

  async countComments(articleId: string): Promise<number> {
    return this.commentRepo.countByArticle(articleId);
  }
}
