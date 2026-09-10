import { Injectable, Inject, Logger } from '@nestjs/common';
import { LIKE_REPOSITORY, type ILikeRepository } from '../../repositories/interfaces/like.repository.interface';
import { ARTICLE_REPOSITORY, type IArticleRepository } from '../../repositories/interfaces/article.repository.interface';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditEventType, type AuthUser, NotificationType } from '../../domain/models';

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(
    @Inject(LIKE_REPOSITORY)
    private readonly likeRepo: ILikeRepository,
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async toggleLike(articleId: string, actor: AuthUser): Promise<{ liked: boolean; likesCount: number }> {
    const existing = await this.likeRepo.findOne(actor.id, articleId);

    if (existing) {
      await this.likeRepo.delete(actor.id, articleId);
      const count = await this.likeRepo.countByArticle(articleId);
      await this.auditService.log({
        actorId: actor.id,
        action: AuditEventType.LIKE_TOGGLED,
        resource: `Article:${articleId}`,
        result: 'SUCCESS',
        metadata: { action: 'unlike' },
      });
      return { liked: false, likesCount: count };
    } else {
      await this.likeRepo.create({ userId: actor.id, articleId });
      const count = await this.likeRepo.countByArticle(articleId);
      await this.auditService.log({
        actorId: actor.id,
        action: AuditEventType.LIKE_TOGGLED,
        resource: `Article:${articleId}`,
        result: 'SUCCESS',
        metadata: { action: 'like' },
      });

      // Asynchronously dispatch grouped like notification to author
      this.dispatchLikeNotification(articleId, actor).catch((err) => {
        this.logger.warn(`Failed to dispatch like notification: ${err.message}`);
      });

      return { liked: true, likesCount: count };
    }
  }

  private async dispatchLikeNotification(articleId: string, actor: AuthUser): Promise<void> {
    const article = await this.articleRepo.findById(articleId);
    if (!article || !article.authorId || article.authorId === actor.id) return;

    const dateKey = new Date().toISOString().slice(0, 10);
    const groupKey = `group:${article.authorId}:ARTICLE_LIKED:${articleId}:${dateKey}`;

    await this.notificationsService.enqueue({
      userId: article.authorId,
      actorId: actor.id,
      actorName: actor.name || 'A Reader',
      actorAvatar: actor.avatarUrl || null,
      type: NotificationType.ARTICLE_LIKED,
      title: 'Story Engagement',
      message: `${actor.name || 'A reader'} liked your story "${article.title}".`,
      resourceType: 'article',
      resourceId: article.id,
      resourceSlug: article.slug,
      groupKey,
    });
  }

  async isLiked(userId: string, articleId: string): Promise<boolean> {
    return !!(await this.likeRepo.findOne(userId, articleId));
  }

  async getLikeCount(articleId: string): Promise<number> {
    return this.likeRepo.countByArticle(articleId);
  }
}
