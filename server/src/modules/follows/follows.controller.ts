import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/security.decorators';
import { FollowTargetType, Permission, type AuthUser } from '../../domain/models';

@ApiTags('follows')
@Controller()
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  // ─── User follows ────────────────────────────────────────────────────────────

  @Post('users/:userId/follow')
  @ApiOperation({ summary: 'Follow a user' })
  @RequirePermissions(Permission.FOLLOW_CREATE)
  async followUser(@Param('userId') userId: string, @CurrentUser() user: AuthUser) {
    return this.followsService.followUser(userId, user);
  }

  @Delete('users/:userId/follow')
  @ApiOperation({ summary: 'Unfollow a user' })
  @RequirePermissions(Permission.FOLLOW_DELETE)
  async unfollowUser(@Param('userId') userId: string, @CurrentUser() user: AuthUser) {
    return this.followsService.unfollowUser(userId, user);
  }

  @Get('users/:userId/follow/status')
  @ApiOperation({ summary: 'Get whether the current user follows a target user' })
  @RequirePermissions(Permission.FOLLOW_READ)
  async getFollowStatus(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const following = await this.followsService.isFollowing(
      user.id,
      FollowTargetType.USER,
      userId,
    );
    return { following };
  }

  @Public()
  @Get('users/:userId/followers')
  @ApiOperation({ summary: 'Get followers of a user' })
  async getUserFollowers(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.followsService.getUserFollowers(userId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('users/:userId/following')
  @ApiOperation({ summary: 'Get users a user is following' })
  async getUserFollowing(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.followsService.getUserFollowing(userId, parseInt(page, 10), parseInt(limit, 10));
  }

  // ─── Category follows ────────────────────────────────────────────────────────

  @Post('categories/:slug/follow')
  @ApiOperation({ summary: 'Follow a topic/category' })
  @RequirePermissions(Permission.FOLLOW_CREATE)
  async followCategory(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.followsService.followCategory(slug, user);
  }

  @Delete('categories/:slug/follow')
  @ApiOperation({ summary: 'Unfollow a topic/category' })
  @RequirePermissions(Permission.FOLLOW_DELETE)
  async unfollowCategory(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.followsService.unfollowCategory(slug, user);
  }

  // ─── My followed topics ───────────────────────────────────────────────────────

  @Get('me/following/topics')
  @ApiOperation({ summary: 'Get topics the current user follows (used for feed personalization)' })
  @RequirePermissions(Permission.FOLLOW_READ)
  async getMyFollowedTopics(@CurrentUser() user: AuthUser) {
    return this.followsService.getMyFollowedTopics(user.id);
  }

  // ─── Profile counters ─────────────────────────────────────────────────────────

  @Public()
  @Get('users/:userId/stats')
  @ApiOperation({ summary: 'Get follower/following counts for a user profile' })
  async getUserFollowStats(@Param('userId') userId: string) {
    const [followersCount, followingCount] = await Promise.all([
      this.followsService.getFollowerCount(FollowTargetType.USER, userId),
      this.followsService.getFollowingCount(userId, FollowTargetType.USER),
    ]);
    return { userId, followersCount, followingCount };
  }
}
