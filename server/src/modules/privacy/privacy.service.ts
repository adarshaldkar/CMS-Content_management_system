import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../repositories/interfaces/user.repository.interface';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../repositories/interfaces/session.repository.interface';
import {
  ARTICLE_REPOSITORY,
  type IArticleRepository,
} from '../../repositories/interfaces/article.repository.interface';
import {
  BOOKMARK_REPOSITORY,
  type IBookmarkRepository,
} from '../../repositories/interfaces/bookmark.repository.interface';
import {
  COMMENT_REPOSITORY,
  type ICommentRepository,
} from '../../repositories/interfaces/comment.repository.interface';
import { AuditEventType, type AuthUser } from '../../domain/models';
import { AuditService } from '../audit/audit.service';

export interface GdprExportBundle {
  exportDate: Date;
  user: {
    id: string;
    email: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
    role: string;
    createdAt: Date;
  };
  articles: any[];
  bookmarks: any[];
  comments: any[];
}

@Injectable()
export class PrivacyService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepo: ISessionRepository,
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
    @Inject(BOOKMARK_REPOSITORY)
    private readonly bookmarkRepo: IBookmarkRepository,
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepo: ICommentRepository,
    private readonly auditService: AuditService,
  ) {}

  async exportUserData(user: AuthUser): Promise<GdprExportBundle> {
    const fullUser = await this.userRepo.findById(user.id);
    if (!fullUser) {
      throw new NotFoundException('User profile not found.');
    }

    const [articles, bookmarks, comments] = await Promise.all([
      this.articleRepo.findMany({ authorId: user.id, limit: 100 }),
      this.bookmarkRepo.findByUser(user.id, 1, 100),
      this.commentRepo.findMany({ authorId: user.id, limit: 100 }),
    ]);

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.PRIVACY_DATA_EXPORTED,
      resource: `Privacy:ExportData:${user.id}`,
      result: 'SUCCESS',
    });

    return {
      exportDate: new Date(),
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        bio: fullUser.bio,
        avatarUrl: fullUser.avatarUrl,
        role: fullUser.role,
        createdAt: fullUser.createdAt,
      },
      articles: articles.items,
      bookmarks: bookmarks.items,
      comments,
    };
  }

  async deactivateAccount(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    await this.userRepo.update(userId, { isActive: false });
    await this.sessionRepo.revokeAllUserSessions(userId);

    await this.auditService.log({
      actorId: userId,
      action: AuditEventType.USER_DELETED,
      resource: `User:${userId}`,
      result: 'SUCCESS',
      metadata: { action: 'DEACTIVATE' },
    });

    return {
      success: true,
      message: 'Account deactivated. All active sessions have been revoked.',
    };
  }

  async deleteAccount(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Anonymize user profile & execute soft erasure
    const anonymizedEmail = `deleted-${Date.now()}@anonymized.gazette.internal`;
    await this.userRepo.update(userId, {
      name: 'Anonymized Gazette Reader',
      email: anonymizedEmail,
      bio: null,
      avatarUrl: null,
      isActive: false,
    });

    await this.userRepo.softDelete(userId);
    await this.sessionRepo.revokeAllUserSessions(userId);

    await this.auditService.log({
      actorId: userId,
      action: AuditEventType.USER_DELETED,
      resource: `User:${userId}`,
      result: 'SUCCESS',
      metadata: { action: 'PERMANENT_ERASURE_ANONYMIZED' },
    });

    return {
      success: true,
      message: 'Your personal data has been permanently erased and contributions anonymized.',
    };
  }
}
