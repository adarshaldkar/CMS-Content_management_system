import { Injectable } from '@nestjs/common';
import type {
  Article,
  ArticleQueryFilters,
  CreateArticleDto,
  PaginatedResult,
  UpdateArticleDto,
  ContentStatus,
} from '../../domain/models';
import { ClickHouseService } from '../../database/clickhouse.service';
import type { IArticleRepository } from '../interfaces/article.repository.interface';

@Injectable()
export class ClickHouseArticleRepository implements IArticleRepository {
  constructor(private readonly clickhouse: ClickHouseService) {}

  private mapRowToArticle(r: any): Article {
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description || null,
      content: r.content || null,
      authorId: r.author_id,
      categoryId: r.category_id || null,
      tagIds: [],
      coverImage: null,
      status: (r.status as ContentStatus) || 'draft',
      version: r.version || 1,
      wordCount: r.word_count || 0,
      readingTimeMinutes: r.reading_time_minutes || 1,
      seoTitle: null,
      seoDescription: null,
      reviewNote: null,
      scheduledAt: null,
      publishedAt: r.published_at ? new Date(r.published_at) : null,
      createdAt: new Date(r.created_at || Date.now()),
      updatedAt: new Date(r.updated_at || Date.now()),
      deletedAt: null,
    };
  }

  async findById(id: string): Promise<Article | null> {
    await this.clickhouse.ensureSchema();
    const res = await this.clickhouse.client.query({
      query: 'SELECT * FROM cms_platform.article_snapshots WHERE id = {id:String} LIMIT 1',
      query_params: { id },
      format: 'JSONEachRow',
    });
    const rows = await res.json<any>();
    if (!rows || rows.length === 0) return null;
    return this.mapRowToArticle(rows[0]);
  }

  async findBySlug(slug: string): Promise<Article | null> {
    await this.clickhouse.ensureSchema();
    const res = await this.clickhouse.client.query({
      query: 'SELECT * FROM cms_platform.article_snapshots WHERE slug = {slug:String} LIMIT 1',
      query_params: { slug },
      format: 'JSONEachRow',
    });
    const rows = await res.json<any>();
    if (!rows || rows.length === 0) return null;
    return this.mapRowToArticle(rows[0]);
  }

  async findMany(filters: ArticleQueryFilters): Promise<PaginatedResult<Article>> {
    await this.clickhouse.ensureSchema();
    const res = await this.clickhouse.client.query({
      query: 'SELECT * FROM cms_platform.article_snapshots ORDER BY created_at DESC LIMIT {limit:UInt32}',
      query_params: { limit: filters.limit || 10 },
      format: 'JSONEachRow',
    });
    const rows = await res.json<any>();
    const items = rows.map((r: any) => this.mapRowToArticle(r));

    return {
      items,
      total: items.length,
      page: filters.page || 1,
      limit: filters.limit || 10,
      totalPages: 1,
    };
  }

  async create(data: CreateArticleDto): Promise<Article> {
    await this.clickhouse.ensureSchema();
    const id = (data as any).id || String(Date.now());
    await this.clickhouse.client.insert({
      table: 'cms_platform.article_snapshots',
      values: [
        {
          id,
          title: data.title,
          slug: data.slug,
          description: data.description || '',
          author_id: data.authorId,
          category_id: data.categoryId || '',
          status: data.status || 'draft',
          version: 1,
          word_count: data.wordCount || 0,
          reading_time_minutes: data.readingTimeMinutes || 1,
        },
      ],
      format: 'JSONEachRow',
    });
    return (await this.findById(id))!;
  }

  async update(id: string, data: UpdateArticleDto): Promise<Article> {
    await this.clickhouse.ensureSchema();
    const existing = await this.findById(id);
    if (!existing) throw new Error('Article not found in ClickHouse');
    await this.clickhouse.client.insert({
      table: 'cms_platform.article_snapshots',
      values: [
        {
          id,
          title: data.title !== undefined ? data.title : existing.title,
          slug: data.slug !== undefined ? data.slug : existing.slug,
          description: data.description !== undefined ? data.description : existing.description || '',
          author_id: existing.authorId,
          category_id: data.categoryId !== undefined ? data.categoryId : existing.categoryId || '',
          status: data.status !== undefined ? data.status : existing.status,
          version: (existing.version || 1) + 1,
          word_count: data.wordCount !== undefined ? data.wordCount : existing.wordCount || 0,
          reading_time_minutes: data.readingTimeMinutes !== undefined ? data.readingTimeMinutes : existing.readingTimeMinutes || 1,
        },
      ],
      format: 'JSONEachRow',
    });
    return (await this.findById(id))!;
  }

  async updateStatus(id: string, status: ContentStatus): Promise<Article> {
    return this.update(id, { status });
  }

  async softDelete(_id: string): Promise<boolean> {
    return true;
  }
}
