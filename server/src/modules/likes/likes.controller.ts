import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/security.decorators';
import { Permission, type AuthUser } from '../../domain/models';

@ApiTags('likes')
@Controller('articles')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':articleId/like')
  @ApiOperation({ summary: 'Toggle like on an article (like if not liked, unlike if liked)' })
  @RequirePermissions(Permission.LIKE_TOGGLE)
  async toggleLike(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.likesService.toggleLike(articleId, user);
  }

  @Public()
  @Get(':articleId/likes/count')
  @ApiOperation({ summary: 'Get public like count for an article' })
  async getLikeCount(@Param('articleId') articleId: string) {
    const count = await this.likesService.getLikeCount(articleId);
    return { articleId, likesCount: count };
  }

  @Get(':articleId/like/status')
  @ApiOperation({ summary: 'Get whether the current user has liked an article' })
  async getLikeStatus(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const liked = await this.likesService.isLiked(user.id, articleId);
    return { liked };
  }
}
