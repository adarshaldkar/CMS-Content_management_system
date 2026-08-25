import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArticleService } from './article.service';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentUser,
  Public,
  RequirePermissions,
} from '../../common/decorators/security.decorators';
import {
  ContentStatus,
  Permission,
  type Article,
  type ArticleRevision,
  type AuthUser,
  type CreateArticleDto,
  type PaginatedResult,
  type UpdateArticleDto,
  type WorkflowTransitionDto,
} from '../../domain/models';

@ApiTags('articles')
@Controller('articles')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
export class ArticlesController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly workflowService: WorkflowService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List public published articles or filter by query' })
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: ContentStatus,
    @Query('search') search?: string,
    @Query('authorId') authorId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('categorySlugs') categorySlugs?: string | string[],
    @Query('tagSlugs') tagSlugs?: string | string[],
    @Query('contentType') contentType?: 'article' | 'video' | 'gallery' | 'series' | 'all',
    @Query('category') category?: string,
    @Query('sort') sort?: 'trending' | 'latest' | 'popular',
    @Query('sortBy') sortBy?: 'latest' | 'trending' | 'most_read' | 'most_discussed' | 'most_liked',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<PaginatedResult<Article>> {
    const resolvedSlug = categorySlug || category;
    const resolvedStatus = status ? status : (authorId || resolvedSlug || categorySlugs) ? (status || undefined) : undefined;
    return this.articleService.findMany({
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 20)),
      status: resolvedStatus,
      search,
      authorId,
      categoryId,
      categorySlug: resolvedSlug,
      categorySlugs,
      tagSlugs,
      contentType,
      sortBy: sortBy || (sort === 'popular' ? 'most_liked' : sort === 'trending' ? 'trending' : 'latest'),
      sortOrder,
      fromDate,
      toDate,
    });
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a published article by slug' })
  async getBySlug(@Param('slug') slug: string): Promise<Article | null> {
    return this.articleService.findBySlug(slug);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get article details by ID for editorial workspace' })
  async getById(@Param('id') id: string): Promise<Article | null> {
    return this.articleService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new draft article' })
  @RequirePermissions(Permission.ARTICLE_CREATE)
  async create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Article> {
    return this.workflowService.createArticle(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an article with optimistic concurrency control' })
  @RequirePermissions(Permission.ARTICLE_UPDATE_OWN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Article> {
    return this.workflowService.updateArticle(id, dto, user);
  }

  @Post(':id/transition')
  @ApiOperation({ summary: 'Execute an editorial workflow state transition' })
  async transition(
    @Param('id') id: string,
    @Body() dto: WorkflowTransitionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Article> {
    return this.workflowService.transitionState(id, dto, user);
  }

  @Get(':id/revisions')
  @ApiOperation({ summary: 'Get immutable revision history for an article' })
  async getRevisions(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ArticleRevision[]> {
    return this.workflowService.getRevisions(id, user);
  }

  @Post(':id/revisions/:revisionId/restore')
  @ApiOperation({ summary: 'Restore an article to a previous revision snapshot' })
  @RequirePermissions(Permission.ARTICLE_UPDATE_OWN)
  async restoreRevision(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Article> {
    return this.workflowService.restoreRevision(id, revisionId, user);
  }

}
