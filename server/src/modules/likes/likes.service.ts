import { Injectable, Inject } from '@nestjs/common';
import { LIKE_REPOSITORY, type ILikeRepository } from '../../repositories/interfaces/like.repository.interface';
import { AuditService } from '../audit/audit.service';
import { AuditEventType, type AuthUser } from '../../domain/models';

@Injectable()
export class LikesService {
  constructor(
    @Inject(LIKE_REPOSITORY)
    private readonly likeRepo: ILikeRepository,
    private readonly auditService: AuditService,
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
      return { liked: true, likesCount: count };
    }
  }

  async isLiked(userId: string, articleId: string): Promise<boolean> {
    return !!(await this.likeRepo.findOne(userId, articleId));
  }

  async getLikeCount(articleId: string): Promise<number> {
    return this.likeRepo.countByArticle(articleId);
  }
}
