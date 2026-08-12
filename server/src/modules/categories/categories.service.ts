import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Category,
  CategoryQueryFilters,
  CreateCategoryDto,
  PaginatedResult,
  UpdateCategoryDto,
} from '../../domain/models';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from '../../repositories/interfaces/category.repository.interface';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async findAll(filters: CategoryQueryFilters): Promise<PaginatedResult<Category>> {
    return this.categoryRepo.findMany(filters);
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found.`);
    }
    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepo.findBySlug(slug);
    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found.`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.categoryRepo.create(dto);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findById(id);
    return this.categoryRepo.update(id, dto);
  }

  async delete(id: string): Promise<boolean> {
    await this.findById(id);
    return this.categoryRepo.softDelete(id);
  }
}
