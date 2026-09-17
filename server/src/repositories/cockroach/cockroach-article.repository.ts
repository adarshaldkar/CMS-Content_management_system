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
import { CockroachDbService } from '../../database/cockroach.service';
import type { IArticleRepository } from '../interfaces/article.repository.interface';

@Injectable()
export class CockroachArticleRepository implements IArticleRepository {
  constructor(private readonly cockroach: CockroachDbService) {}

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
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM articles WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
      [id],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRowToArticle(rows[0]);
  }

  async findBySlug(slug: string): Promise<Article | null> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM articles WHERE slug = $1 AND deleted_at IS NULL LIMIT 1',
      [slug],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRowToArticle(rows[0]);
  }

  async findMany(filters: ArticleQueryFilters): Promise<PaginatedResult<Article>> {
    await this.cockroach.ensureSchema();
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.authorId) {
      conditions.push(`author_id = $${idx++}`);
      params.push(filters.authorId);
    }
    if (filters.categoryId) {
      conditions.push(`category_id = $${idx++}`);
      params.push(filters.categoryId);
    }
    if (filters.search) {
      conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR content ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const { rows: countRows } = await this.cockroach.pool.query(
      `SELECT COUNT(*) as total FROM articles ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0]?.total || '0', 10);

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    const { rows } = await this.cockroach.pool.query(
      `SELECT * FROM articles ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return {
      items: rows.map((r) => this.mapRowToArticle(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: CreateArticleDto): Promise<Article> {
    await this.cockroach.ensureSchema();
    const id = randomUUID();
    const status = data.status || 'draft';

    await this.cockroach.pool.query(
      `INSERT INTO articles (id, title, slug, description, content, author_id, category_id, cover_image, status, version, word_count, reading_time_minutes, seo_title, seo_description, review_note, tag_ids, scheduled_at, published_at, publishing_slot_id, auto_dispatched)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
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
        data.autoDispatched || false,
      ],
    );

    return (await this.findById(id))!;
  }

  async update(id: string, data: UpdateArticleDto): Promise<Article> {
    await this.cockroach.ensureSchema();
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${idx++}`);
      params.push(data.title);
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${idx++}`);
      params.push(data.slug);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(data.description);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${idx++}`);
      params.push(data.content);
    }
    if (data.categoryId !== undefined) {
      updates.push(`category_id = $${idx++}`);
      params.push(data.categoryId);
    }
    if (data.coverImage !== undefined) {
      updates.push(`cover_image = $${idx++}`);
      params.push(data.coverImage);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(data.status);
    }
    if (data.wordCount !== undefined) {
      updates.push(`word_count = $${idx++}`);
      params.push(data.wordCount);
    }
    if (data.readingTimeMinutes !== undefined) {
      updates.push(`reading_time_minutes = $${idx++}`);
      params.push(data.readingTimeMinutes);
    }
    if (data.seoTitle !== undefined) {
      updates.push(`seo_title = $${idx++}`);
      params.push(data.seoTitle);
    }
    if (data.seoDescription !== undefined) {
      updates.push(`seo_description = $${idx++}`);
      params.push(data.seoDescription);
    }
    if (data.reviewNote !== undefined) {
      updates.push(`review_note = $${idx++}`);
      params.push(data.reviewNote);
    }
    if (data.scheduledAt !== undefined) {
      updates.push(`scheduled_at = $${idx++}`);
      params.push(data.scheduledAt ? new Date(data.scheduledAt) : null);
    }
    if (data.publishedAt !== undefined) {
      updates.push(`published_at = $${idx++}`);
      params.push(data.publishedAt ? new Date(data.publishedAt) : null);
    }
    if (data.publishingSlotId !== undefined) {
      updates.push(`publishing_slot_id = $${idx++}`);
      params.push(data.publishingSlotId);
    }
    if (data.autoDispatched !== undefined) {
      updates.push(`auto_dispatched = $${idx++}`);
      params.push(data.autoDispatched || false);
    }

    if (updates.length > 0) {
      updates.push(`version = version + 1`, `updated_at = now()`);
      params.push(id);
      await this.cockroach.pool.query(
        `UPDATE articles SET ${updates.join(', ')} WHERE id = $${idx}`,
        params,
      );
    }

    return (await this.findById(id))!;
  }

  async updateStatus(id: string, status: ContentStatus): Promise<Article> {
    await this.cockroach.ensureSchema();
    await this.cockroach.pool.query(
      'UPDATE articles SET status = $1, published_at = CASE WHEN $2 = \'published\' THEN now() ELSE published_at END WHERE id = $3',
      [status, status, id],
    );
    return (await this.findById(id))!;
  }

  async softDelete(id: string): Promise<boolean> {
    await this.cockroach.ensureSchema();
    const { rowCount } = await this.cockroach.pool.query(
      'UPDATE articles SET deleted_at = now() WHERE id = $1',
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
