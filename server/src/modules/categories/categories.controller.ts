import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { Public, RequirePermissions } from '../../common/decorators/security.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { Permission, type Category, type PaginatedResult } from '../../domain/models';
import { RedisService } from '../../redis/redis.service';
import { RedisCacheInterceptor, Cacheable } from '../../redis/redis-cache.interceptor';

@ApiTags('categories')
@Controller('categories')
@UseGuards(CsrfGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @UseInterceptors(RedisCacheInterceptor)
  @Cacheable(600)
  @Get()
  @ApiOperation({ summary: 'List all categories with pagination & search' })
  async findAll(@Query() query: ListCategoriesQueryDto): Promise<PaginatedResult<Category>> {
    return this.categoriesService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 50,
      search: query.search,
      status: query.status,
    });
  }

  @Public()
  @UseInterceptors(RedisCacheInterceptor)
  @Cacheable(600)
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  async findBySlug(@Param('slug') slug: string): Promise<Category> {
    return this.categoriesService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<Category> {
    return this.categoriesService.findById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CATEGORY_CREATE)
  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  async create(
    @Body() body: { name: string; slug: string; description?: string; status?: 'active' | 'inactive' },
  ): Promise<Category> {
    const category = await this.categoriesService.create(body);
    await this.invalidateCategoryCache(category);
    return category;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CATEGORY_UPDATE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; description?: string; status?: 'active' | 'inactive' },
  ): Promise<Category> {
    const category = await this.categoriesService.update(id, body);
    await this.invalidateCategoryCache(category);
    return category;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CATEGORY_DELETE)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a category' })
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.categoriesService.delete(id);
    await this.redisService.delCached('cms:v1:cache:categories');
    return { success };
  }

  private async invalidateCategoryCache(category?: Category | null): Promise<void> {
    if (!category) return;
    await this.redisService.delCached(
      `cms:v1:cache:categories:slug:${category.slug}`,
      `cms:v1:cache:categories:id:${category.id}`,
      'cms:v1:cache:categories',
    );
  }
}
