import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Article,
  ArticleQueryFilters,
  CreateArticleDto,
  PaginatedResult,
  UpdateArticleDto,
  ContentStatus,
} from '../../domain/models';
import { MariaDbService } from '../../database/mariadb.service';
import type { IArticleRepository } from '../interfaces/article.repository.interface';

@Injectable()
export class MariaDbArticleRepository implements IArticleRepository {
  constructor(private readonly mariadb: MariaDbService) {}

  private mapRowToArticle(row: any): Article {
    let tagIds: string[] = [];
    try {
      if (typeof row.tag_ids === 'string') tagIds = JSON.parse(row.tag_ids);
      else if (Array.isArray(row.tag_ids)) tagIds = row.tag_ids;
    } catch {
      tagIds = [];
    }

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description || null,
      content: row.content || null,
      authorId: row.author_id,
      categoryId: row.category_id || null,
      tagIds: tagIds.map(String),
      coverImage: row.cover_image || null,
      status: row.status as ContentStatus,
      version: row.version || 1,
      wordCount: row.word_count || 0,
      readingTimeMinutes: row.reading_time_minutes || 1,
      seoTitle: row.seo_title || null,
      seoDescription: row.seo_description || null,
      reviewNote: row.review_note || null,
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : null,
      publishedAt: row.published_at ? new Date(row.published_at) : null,
      publishingSlotId: row.publishing_slot_id || null,
      autoDispatched: Boolean(row.auto_dispatched),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    };
  }

  async findById(id: string): Promise<Article | null> {
    await this.mariadb.ensureSchema();
    const [rows] = await this.mariadb.pool.query(
      'SELECT * FROM articles WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id],
    ) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRowToArticle(rows[0]);
  }

  async findBySlug(slug: string): Promise<Article | null> {
    await this.mariadb.ensureSchema();
    const [rows] = await this.mariadb.pool.query(
      'SELECT * FROM articles WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
      [slug],
    ) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRowToArticle(rows[0]);
  }

  async findMany(filters: ArticleQueryFilters): Promise<PaginatedResult<Article>> {
    await this.mariadb.ensureSchema();
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.authorId) {
      conditions.push('author_id = ?');
      params.push(filters.authorId);
    }
    if (filters.categoryId) {
      conditions.push('category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.search) {
      conditions.push('(title LIKE ? OR description LIKE ? OR content LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const [countRows] = await this.mariadb.pool.query(
      `SELECT COUNT(*) as total FROM articles ${whereClause}`,
      params,
    ) as any;
    const total = countRows[0]?.total || 0;

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    const [rows] = await this.mariadb.pool.query(
      `SELECT * FROM articles ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ) as any;

    return {
      items: (rows || []).map((r: any) => this.mapRowToArticle(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: CreateArticleDto): Promise<Article> {
    await this.mariadb.ensureSchema();
    const id = randomUUID();
    const status = data.status || 'draft';

    await this.mariadb.pool.query(
      `INSERT INTO articles (id, title, slug, description, content, author_id, category_id, cover_image, status, version, word_count, reading_time_minutes, seo_title, seo_description, review_note, tag_ids, scheduled_at, published_at, publishing_slot_id, auto_dispatched)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.slug,
        data.description || null,
        data.content || null,
        data.authorId,
        data.categoryId || null,
        data.coverImage || null,
        status,
        data.wordCount || 0,
        data.readingTimeMinutes || 1,
        data.seoTitle || null,
        data.seoDescription || null,
        data.reviewNote || null,
        JSON.stringify(data.tagIds || []),
        data.scheduledAt ? new Date(data.scheduledAt) : null,
        status === 'published' ? new Date() : null,
        data.publishingSlotId || null,
        data.autoDispatched ? 1 : 0,
      ],
    );

    return (await this.findById(id))!;
  }

  async update(id: string, data: UpdateArticleDto): Promise<Article> {
    await this.mariadb.ensureSchema();
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.slug !== undefined) {
      updates.push('slug = ?');
      params.push(data.slug);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      params.push(data.content);
    }
    if (data.categoryId !== undefined) {
      updates.push('category_id = ?');
      params.push(data.categoryId);
    }
    if (data.coverImage !== undefined) {
      updates.push('cover_image = ?');
      params.push(data.coverImage);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.wordCount !== undefined) {
      updates.push('word_count = ?');
      params.push(data.wordCount);
    }
    if (data.readingTimeMinutes !== undefined) {
      updates.push('reading_time_minutes = ?');
      params.push(data.readingTimeMinutes);
    }
    if (data.seoTitle !== undefined) {
      updates.push('seo_title = ?');
      params.push(data.seoTitle);
    }
    if (data.seoDescription !== undefined) {
      updates.push('seo_description = ?');
      params.push(data.seoDescription);
    }
    if (data.reviewNote !== undefined) {
      updates.push('review_note = ?');
      params.push(data.reviewNote);
    }
    if (data.scheduledAt !== undefined) {
      updates.push('scheduled_at = ?');
      params.push(data.scheduledAt ? new Date(data.scheduledAt) : null);
    }
    if (data.publishedAt !== undefined) {
      updates.push('published_at = ?');
      params.push(data.publishedAt ? new Date(data.publishedAt) : null);
    }
    if (data.publishingSlotId !== undefined) {
      updates.push('publishing_slot_id = ?');
      params.push(data.publishingSlotId);
    }
    if (data.autoDispatched !== undefined) {
      updates.push('auto_dispatched = ?');
      params.push(data.autoDispatched ? 1 : 0);
    }

    if (updates.length > 0) {
      await this.mariadb.pool.query(
        `UPDATE articles SET ${updates.join(', ')}, version = version + 1 WHERE id = ?`,
        [...params, id],
      );
    }

    return (await this.findById(id))!;
  }

  async updateStatus(id: string, status: ContentStatus): Promise<Article> {
    await this.mariadb.ensureSchema();
    await this.mariadb.pool.query(
      'UPDATE articles SET status = ?, published_at = CASE WHEN ? = "published" THEN NOW() ELSE published_at END WHERE id = ?',
      [status, status, id],
    );
    return (await this.findById(id))!;
  }

  async softDelete(id: string): Promise<boolean> {
    await this.mariadb.ensureSchema();
    const [res] = await this.mariadb.pool.query(
      'UPDATE articles SET deleted_at = NOW() WHERE id = ?',
      [id],
    ) as any;
    return res?.affectedRows > 0;
  }
}
