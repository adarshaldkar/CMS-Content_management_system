import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentUser,
  Public,
  RequirePermissions,
} from '../../common/decorators/security.decorators';
import { Permission, type AuthUser } from '../../domain/models';

@ApiTags('comments')
@Controller()
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get('articles/:articleId/comments')
  @ApiOperation({ summary: 'Get paginated comments for an article' })
  async getComments(
    @Param('articleId') articleId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.commentsService.getComments(
      articleId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Public()
  @Get('users/:userId/comments')
  @ApiOperation({ summary: 'Get recent comments made by a user' })
  async getUserComments(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.commentsService.getUserComments(
      userId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Get('me/comments')
  @ApiOperation({ summary: 'Get comments made by the current logged-in user' })
  async getMyComments(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.commentsService.getUserComments(
      user.id,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Post('articles/:articleId/comments')
  @ApiOperation({ summary: 'Post a comment on an article' })
  @RequirePermissions(Permission.COMMENT_CREATE)
  async createComment(
    @Param('articleId') articleId: string,
    @Body() body: { body?: string; content?: string; parentId?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const text = body.body || body.content || '';
    return this.commentsService.createComment(articleId, { body: text, parentId: body.parentId }, user);
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Edit own comment' })
  @RequirePermissions(Permission.COMMENT_UPDATE_OWN)
  async updateComment(
    @Param('id') id: string,
    @Body() body: { body?: string; content?: string },
    @CurrentUser() user: AuthUser,
  ) {
    const text = body.body !== undefined ? body.body : body.content;
    return this.commentsService.updateComment(id, { body: text }, user);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete own comment or moderate' })
  @RequirePermissions(Permission.COMMENT_DELETE_OWN)
  async deleteComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.commentsService.deleteComment(id, user);
  }

  @Post('comments/:id/hide')
  @ApiOperation({ summary: 'Hide a comment (moderator)' })
  @RequirePermissions(Permission.COMMENT_MODERATE)
  async hideComment(
    @Param('id') id: string,
    @Body() body: { moderationNote?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.commentsService.hideComment(id, body.moderationNote || 'Hidden by moderator', user);
  }

  @Get('comments')
  @ApiOperation({ summary: 'Admin: list all comments with optional filters' })
  @RequirePermissions(Permission.COMMENT_MODERATE)
  async listAllComments(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('flagged') flagged?: string,
    @Query('hidden') hidden?: string,
    @Query('articleId') articleId?: string,
  ) {
    return this.commentsService.listAllComments({
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 50, 100),
      flagged: flagged === 'true',
      hidden: hidden === 'true',
      articleId,
    });
  }
}
