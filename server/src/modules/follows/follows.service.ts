import { Injectable, Inject, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { FOLLOW_REPOSITORY, type IFollowRepository } from '../../repositories/interfaces/follow.repository.interface';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditEventType, FollowTargetType, NotificationType, type AuthUser } from '../../domain/models';

@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name);

  constructor(
    @Inject(FOLLOW_REPOSITORY)
    private readonly followRepo: IFollowRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async followUser(targetUserId: string, actor: AuthUser) {
    const count = await this.followRepo.countFollowers(FollowTargetType.USER, targetUserId);
    if (targetUserId === actor.id) {
      return { following: false, isSelf: true, followersCount: count };
    }
    const existing = await this.followRepo.findOne(actor.id, FollowTargetType.USER, targetUserId);
    if (existing) {
      return { following: true, followersCount: count };
    }
    await this.followRepo.create({
      followerId: actor.id,
      targetType: FollowTargetType.USER,
      targetId: targetUserId,
    });
    await this.auditService.log({
      actorId: actor.id,
      action: AuditEventType.FOLLOW_CREATED,
      resource: `User:${targetUserId}`,
      result: 'SUCCESS',
    });
    const updatedCount = await this.followRepo.countFollowers(FollowTargetType.USER, targetUserId);

    // Asynchronously dispatch grouped new-follower notification
    const dateKey = new Date().toISOString().slice(0, 10);
    const groupKey = `group:${targetUserId}:NEW_FOLLOWER:author:${dateKey}`;
    this.notificationsService
      .enqueue({
        userId: targetUserId,
        actorId: actor.id,
        actorName: actor.name || 'A Reader',
        actorAvatar: actor.avatarUrl || null,
        type: NotificationType.NEW_FOLLOWER,
        title: 'New Dispatch Follower',
        message: `${actor.name || 'A reader'} started following your editorial dispatches.`,
        resourceType: 'user',
        resourceId: actor.id,
        resourceSlug: actor.id,
        groupKey,
      })
      .catch((err) => {
        this.logger.warn(`Failed to dispatch follow notification: ${err.message}`);
      });

    return { following: true, followersCount: updatedCount };
  }

  async unfollowUser(targetUserId: string, actor: AuthUser) {
    await this.followRepo.delete(actor.id, FollowTargetType.USER, targetUserId);
    await this.auditService.log({
      actorId: actor.id,
      action: AuditEventType.FOLLOW_DELETED,
      resource: `User:${targetUserId}`,
      result: 'SUCCESS',
    });
    const count = await this.followRepo.countFollowers(FollowTargetType.USER, targetUserId);
    return { following: false, followersCount: count };
  }

  async followCategory(categorySlug: string, actor: AuthUser) {
    const existing = await this.followRepo.findOne(actor.id, FollowTargetType.CATEGORY, categorySlug);
    if (existing) {
      const count = await this.followRepo.countFollowers(FollowTargetType.CATEGORY, categorySlug);
      return { following: true, followersCount: count };
    }
    await this.followRepo.create({
      followerId: actor.id,
      targetType: FollowTargetType.CATEGORY,
      targetId: categorySlug,
    });
    const count = await this.followRepo.countFollowers(FollowTargetType.CATEGORY, categorySlug);
    return { following: true, followersCount: count };
  }

  async unfollowCategory(categorySlug: string, actor: AuthUser) {
    await this.followRepo.delete(actor.id, FollowTargetType.CATEGORY, categorySlug);
    const count = await this.followRepo.countFollowers(FollowTargetType.CATEGORY, categorySlug);
    return { following: false, followersCount: count };
  }

  async isFollowing(followerId: string, targetType: FollowTargetType, targetId: string): Promise<boolean> {
    return !!(await this.followRepo.findOne(followerId, targetType, targetId));
  }

  async getFollowerCount(targetType: FollowTargetType, targetId: string): Promise<number> {
    return this.followRepo.countFollowers(targetType, targetId);
  }

  async getFollowingCount(followerId: string, targetType: FollowTargetType): Promise<number> {
    return this.followRepo.countFollowing(followerId, targetType);
  }

  async getUserFollowers(targetUserId: string, page = 1, limit = 20) {
    return this.followRepo.findMany({
      targetType: FollowTargetType.USER,
      targetId: targetUserId,
      page,
      limit,
    });
  }

  async getUserFollowing(followerId: string, page = 1, limit = 20) {
    return this.followRepo.findMany({
      followerId,
      targetType: FollowTargetType.USER,
      page,
      limit,
    });
  }

  async getMyFollowedTopics(followerId: string) {
    return this.followRepo.findMany({
      followerId,
      targetType: FollowTargetType.CATEGORY,
      page: 1,
      limit: 100,
    });
  }
}
