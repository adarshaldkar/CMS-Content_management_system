import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../../common/decorators/security.decorators';
import { Permission, type AuthUser } from '../../domain/models';

@ApiTags('bookmarks')
@Controller()
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get('me/bookmarks')
  @ApiOperation({ summary: 'Get current user saved bookmarks with pagination' })
  @RequirePermissions(Permission.BOOKMARK_READ)
  async getMyBookmarks(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.bookmarksService.getUserBookmarks(
      user.id,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Get('articles/:articleId/bookmark/status')
  @ApiOperation({ summary: 'Get whether the current user has bookmarked an article' })
  @RequirePermissions(Permission.BOOKMARK_READ)
  async getBookmarkStatus(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const bookmarked = await this.bookmarksService.isBookmarked(user.id, articleId);
    return { bookmarked };
  }

  @Post('articles/:articleId/bookmark')
  @ApiOperation({ summary: 'Toggle bookmark on an article (add if absent, remove if present)' })
  @RequirePermissions(Permission.BOOKMARK_CREATE)
  async toggleBookmark(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookmarksService.toggleBookmark(articleId, user);
  }

  @Delete('articles/:articleId/bookmark')
  @ApiOperation({ summary: 'Remove bookmark from an article' })
  @RequirePermissions(Permission.BOOKMARK_DELETE)
  async removeBookmark(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookmarksService.removeBookmark(articleId, user);
  }
}
