import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { BOOKMARK_REPOSITORY, type IBookmarkRepository } from '../../repositories/interfaces/bookmark.repository.interface';
import { AuditService } from '../audit/audit.service';
import { AuditEventType, type AuthUser } from '../../domain/models';

@Injectable()
export class BookmarksService {
  constructor(
    @Inject(BOOKMARK_REPOSITORY)
    private readonly bookmarkRepo: IBookmarkRepository,
    private readonly auditService: AuditService,
  ) {}

  async getUserBookmarks(userId: string, page = 1, limit = 20) {
    return this.bookmarkRepo.findByUser(userId, page, limit);
  }

  async toggleBookmark(articleId: string, actor: AuthUser): Promise<{ bookmarked: boolean; bookmarksCount: number }> {
    const existing = await this.bookmarkRepo.findOne(actor.id, articleId);

    if (existing) {
      await this.bookmarkRepo.delete(actor.id, articleId);
      await this.auditService.log({
        actorId: actor.id,
        action: AuditEventType.BOOKMARK_DELETED,
        resource: `Article:${articleId}`,
        result: 'SUCCESS',
      });
      const count = await this.bookmarkRepo.countByArticle(articleId);
      return { bookmarked: false, bookmarksCount: count };
    } else {
      await this.bookmarkRepo.create({ userId: actor.id, articleId });
      await this.auditService.log({
        actorId: actor.id,
        action: AuditEventType.BOOKMARK_CREATED,
        resource: `Article:${articleId}`,
        result: 'SUCCESS',
      });
      const count = await this.bookmarkRepo.countByArticle(articleId);
      return { bookmarked: true, bookmarksCount: count };
    }
  }

  async isBookmarked(userId: string, articleId: string): Promise<boolean> {
    const bookmark = await this.bookmarkRepo.findOne(userId, articleId);
    return !!bookmark;
  }

  async getBookmarkCount(articleId: string): Promise<number> {
    return this.bookmarkRepo.countByArticle(articleId);
  }
}
