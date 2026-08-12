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
import { CategoriesService } from './categories.service';
import { Public, RequirePermissions } from '../../common/decorators/security.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { Permission, type Category, type PaginatedResult } from '../../domain/models';

@ApiTags('categories')
@Controller('categories')
@UseGuards(CsrfGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all categories with pagination & search' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive',
  ): Promise<PaginatedResult<Category>> {
    return this.categoriesService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search,
      status,
    });
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  async findBySlug(@Param('slug') slug: string): Promise<Category> {
    return this.categoriesService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findById(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.findById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CATEGORY_CREATE)
  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  async create(
    @Body() body: { name: string; slug: string; description?: string; status?: 'active' | 'inactive' },
  ): Promise<Category> {
    return this.categoriesService.create(body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CATEGORY_UPDATE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; description?: string; status?: 'active' | 'inactive' },
  ): Promise<Category> {
    return this.categoriesService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CATEGORY_DELETE)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a category' })
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.categoriesService.delete(id);
    return { success };
  }
}
