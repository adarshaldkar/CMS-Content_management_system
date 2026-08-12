import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  Article,
  ArticleQueryFilters,
  ContentStatus,
  CreateArticleDto,
  PaginatedResult,
  UpdateArticleDto,
} from '../../domain/models';
import { ArticleSchemaClass, type ArticleDocument } from './article.schema';
import type { IArticleRepository } from '../interfaces/article.repository.interface';

@Injectable()
export class MongoArticleRepository implements IArticleRepository {
  constructor(
    @InjectModel(ArticleSchemaClass.name)
    private readonly articleModel: Model<ArticleDocument>,
  ) {}

  private toDomain(doc: ArticleDocument): Article {
    return {
      id: doc._id.toString(),
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      content: doc.content,
      authorId: doc.authorId,
      categoryId: doc.categoryId,
      tagIds: doc.tagIds,
      coverImage: doc.coverImage,
      status: doc.status as ContentStatus,
      version: doc.version ?? 1,
      wordCount: doc.wordCount ?? 0,
      readingTimeMinutes: doc.readingTimeMinutes ?? 1,
      seoTitle: doc.seoTitle,
      seoDescription: doc.seoDescription,
      reviewNote: doc.reviewNote ?? null,
      scheduledAt: doc.scheduledAt ?? null,
      publishedAt: doc.publishedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt,
    };
  }

  async findById(id: string): Promise<Article | null> {
    const doc = await this.articleModel
      .findOne({ _id: id, deletedAt: null })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findBySlug(slug: string): Promise<Article | null> {
    const doc = await this.articleModel
      .findOne({ slug, deletedAt: null })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findMany(
    filters: ArticleQueryFilters,
  ): Promise<PaginatedResult<Article>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { deletedAt: null };
    if (filters.status) query.status = filters.status;
    if (filters.authorId) query.authorId = filters.authorId;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.search) {
      const safeSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (filters.sort === 'trending') {
      sortOption = { wordCount: -1, createdAt: -1 };
    } else if (filters.sort === 'latest') {
      sortOption = { publishedAt: -1, createdAt: -1 };
    }

    const [docs, total] = await Promise.all([
      this.articleModel
        .find(query)
        .sort(sortOption as any)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.articleModel.countDocuments(query).exec(),
    ]);

    return {
      items: docs.map((d) => this.toDomain(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async create(data: CreateArticleDto): Promise<Article> {
    const doc = await this.articleModel.create({
      ...data,
      version: 1,
      wordCount: data.wordCount ?? 0,
      readingTimeMinutes: data.readingTimeMinutes ?? 1,
    });
    return this.toDomain(doc);
  }

  async update(id: string, data: UpdateArticleDto): Promise<Article> {
    const doc = await this.articleModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $set: data },
        { new: true },
      )
      .exec();
    if (!doc) throw new Error('Article not found');
    return this.toDomain(doc);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.articleModel
      .updateOne({ _id: id }, { $set: { deletedAt: new Date() } })
      .exec();
    return result.modifiedCount > 0;
  }

  async updateStatus(id: string, status: ContentStatus): Promise<Article> {
    const publishedAt = status === 'published' ? new Date() : undefined;
    const updateData: Record<string, unknown> = { status };
    if (publishedAt) {
      updateData.publishedAt = publishedAt;
    }
    return this.update(id, updateData as UpdateArticleDto);
  }
}
