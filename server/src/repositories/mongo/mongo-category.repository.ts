import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  Category,
  CategoryQueryFilters,
  CreateCategoryDto,
  PaginatedResult,
  UpdateCategoryDto,
} from '../../domain/models';
import { CategorySchemaClass, type CategoryDocument } from './category.schema';
import type { ICategoryRepository } from '../interfaces/category.repository.interface';

@Injectable()
export class MongoCategoryRepository implements ICategoryRepository {
  constructor(
    @InjectModel(CategorySchemaClass.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  private toDomain(doc: CategoryDocument): Category {
    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findById(id: string): Promise<Category | null> {
    const doc = await this.categoryModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const doc = await this.categoryModel.findOne({ slug }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findMany(
    filters: CategoryQueryFilters,
  ): Promise<PaginatedResult<Category>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { slug: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [docs, total] = await Promise.all([
      this.categoryModel
        .find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async create(data: CreateCategoryDto): Promise<Category> {
    const doc = await this.categoryModel.create({
      ...data,
      description: data.description ?? null,
      status: data.status ?? 'active',
    });
    return this.toDomain(doc);
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    const doc = await this.categoryModel
      .findOneAndUpdate({ _id: id }, { $set: data }, { new: true })
      .exec();
    if (!doc) throw new Error('Category not found');
    return this.toDomain(doc);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.categoryModel
      .updateOne({ _id: id }, { $set: { status: 'inactive' } })
      .exec();
    return result.modifiedCount > 0;
  }
}
