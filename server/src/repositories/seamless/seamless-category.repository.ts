import { Logger } from '@nestjs/common';
import type {
  Category,
  CategoryQueryFilters,
  CreateCategoryDto,
  PaginatedResult,
  UpdateCategoryDto,
} from '../../domain/models';
import type { ICategoryRepository } from '../interfaces/category.repository.interface';

/**
 * SeamlessCategoryRepository
 *
 * Wraps active and peer category repositories. On a category miss in the active DB,
 * pulls the category definition from the peer DB and replicates it into the active DB.
 */
export class SeamlessCategoryRepository implements ICategoryRepository {
  private readonly logger = new Logger(SeamlessCategoryRepository.name);

  constructor(
    private readonly activeRepo: ICategoryRepository,
    private readonly peerRepo: ICategoryRepository,
    private readonly activeDbName: string,
    private readonly peerDbName: string,
  ) {}

  async findById(id: string): Promise<Category | null> {
    const category = await this.activeRepo.findById(id);
    if (category) return category;

    try {
      const peerCategory = await this.peerRepo.findById(id);
      if (peerCategory) {
        this.logger.log(
          `[Seamless Sync] JIT replicating category "${peerCategory.name}" from ${this.peerDbName} to ${this.activeDbName} by ID`,
        );
        return await this.activeRepo.create({
          name: peerCategory.name,
          slug: peerCategory.slug,
          description: peerCategory.description,
          status: peerCategory.status,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Category lookup by ID failed: ${err.message}`);
    }

    return null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const category = await this.activeRepo.findBySlug(slug);
    if (category) return category;

    try {
      const peerCategory = await this.peerRepo.findBySlug(slug);
      if (peerCategory) {
        this.logger.log(
          `[Seamless Sync] JIT replicating category "${peerCategory.name}" from ${this.peerDbName} to ${this.activeDbName} by Slug`,
        );
        return await this.activeRepo.create({
          name: peerCategory.name,
          slug: peerCategory.slug,
          description: peerCategory.description,
          status: peerCategory.status,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Category lookup by Slug failed: ${err.message}`);
    }

    return null;
  }

  async findMany(filters: CategoryQueryFilters): Promise<PaginatedResult<Category>> {
    return this.activeRepo.findMany(filters);
  }

  async create(data: CreateCategoryDto): Promise<Category> {
    return this.activeRepo.create(data);
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    return this.activeRepo.update(id, data);
  }

  async softDelete(id: string): Promise<boolean> {
    return this.activeRepo.softDelete(id);
  }
}
