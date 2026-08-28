import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type {
  Article,
  ArticleQueryFilters,
  ContentStatus,
  CreateArticleDto,
  PaginatedResult,
  UpdateArticleDto,
} from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { IArticleRepository } from '../interfaces/article.repository.interface';

interface ArticleRow extends QueryResultRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  author_id: string;
  category_id: string | null;
  tag_ids: unknown;
  cover_image: string | null;
  status: string;
  version: number;
  word_count: number;
  reading_time_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
  review_note: string | null;
  scheduled_at: Date | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  category_slug?: string | null;
  author_name?: string | null;
  author_avatar?: string | null;
}

interface CountRow extends QueryResultRow {
  total: number;
}

@Injectable()
export class PostgresArticleRepository implements IArticleRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS articles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL,
          slug text NOT NULL UNIQUE,
          description text NOT NULL DEFAULT '',
          content text NOT NULL DEFAULT '',
          author_id text NOT NULL,
          category_id text,
          tag_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
          cover_image text,
          status text NOT NULL DEFAULT 'draft',
          version int NOT NULL DEFAULT 1,
          word_count int NOT NULL DEFAULT 0,
          reading_time_minutes int NOT NULL DEFAULT 1,
          seo_title text,
          seo_description text,
          review_note text,
          scheduled_at timestamptz,
          published_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        );

        -- Add any missing columns for existing tables
        ALTER TABLE articles ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;
        ALTER TABLE articles ADD COLUMN IF NOT EXISTS word_count int NOT NULL DEFAULT 0;
        ALTER TABLE articles ADD COLUMN IF NOT EXISTS reading_time_minutes int NOT NULL DEFAULT 1;
        ALTER TABLE articles ADD COLUMN IF NOT EXISTS review_note text;
        ALTER TABLE articles ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

        CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
        CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
        CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles(category_id);
        CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_articles_scheduled ON articles(scheduled_at);
      `,
      )
      .then(() => undefined);

    await this.ready;
  }

  private toDomain(row: ArticleRow): Article {
    const tagIds = Array.isArray(row.tag_ids) ? row.tag_ids : [];
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      content: row.content,
      authorId: row.author_id,
      categoryId: row.category_id,
      categorySlug: row.category_slug || undefined,
      author: row.author_name
        ? {
            id: row.author_id,
            name: row.author_name,
            avatarUrl: row.author_avatar || null,
          }
        : undefined,
      tagIds: tagIds.map(String),
      coverImage: row.cover_image,
      status: row.status as ContentStatus,
      version: row.version ?? 1,
      wordCount: row.word_count ?? 0,
      readingTimeMinutes: row.reading_time_minutes ?? 1,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      reviewNote: row.review_note,
      scheduledAt: row.scheduled_at,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  async findById(id: string): Promise<Article | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<ArticleRow>(
      `SELECT a.*, c.slug AS category_slug, u.name AS author_name, u.avatar_url AS author_avatar 
       FROM articles a 
       LEFT JOIN categories c ON a.category_id::text = c.id::text 
       LEFT JOIN cms_users u ON a.author_id::text = u.id::text 
       WHERE a.id = $1 AND a.deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Article | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<ArticleRow>(
      `SELECT a.*, c.slug AS category_slug, u.name AS author_name, u.avatar_url AS author_avatar 
       FROM articles a 
       LEFT JOIN categories c ON a.category_id::text = c.id::text 
       LEFT JOIN cms_users u ON a.author_id::text = u.id::text 
       WHERE a.slug = $1 AND a.deleted_at IS NULL`,
      [slug],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findMany(filters: ArticleQueryFilters): Promise<PaginatedResult<Article>> {
    await this.ensureSchema();
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const values: unknown[] = [];
    const clauses: string[] = ['a.deleted_at IS NULL'];

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`a.status = $${values.length}`);
    }

    if (filters.authorId) {
      values.push(filters.authorId);
      clauses.push(`a.author_id = $${values.length}`);
    }

    if (filters.categoryId) {
      values.push(filters.categoryId);
      clauses.push(`a.category_id = $${values.length}`);
    }

    if (filters.categorySlug) {
      const slugAliases = [filters.categorySlug];
      if (filters.categorySlug === 'ai') slugAliases.push('artificial-intelligence');
      if (filters.categorySlug === 'artificial-intelligence') slugAliases.push('ai');
      if (filters.categorySlug === 'governance') slugAliases.push('policy-governance');
      if (filters.categorySlug === 'policy-governance') slugAliases.push('governance');
      if (filters.categorySlug === 'media-culture') slugAliases.push('media-society', 'media');

      values.push(slugAliases);
      clauses.push(
        `(
          a.category_id IN (SELECT id::text FROM categories WHERE slug = ANY($${values.length}))
          OR a.id IN (
            SELECT a2.id FROM articles a2
            JOIN categories cat ON cat.slug = ANY($${values.length})
            WHERE (a2.title ILIKE '%' || cat.name || '%'
                   OR a2.description ILIKE '%' || cat.name || '%')
              AND a2.category_id IS NULL
              AND a2.deleted_at IS NULL
          )
        )`,
      );
    }

    if (filters.categorySlugs) {
      const rawSlugs = Array.isArray(filters.categorySlugs)
        ? filters.categorySlugs
        : filters.categorySlugs.split(',').map((s) => s.trim()).filter(Boolean);
      
      const expandedSlugs = new Set<string>();
      for (const s of rawSlugs) {
        expandedSlugs.add(s);
        if (s === 'ai') expandedSlugs.add('artificial-intelligence');
        if (s === 'artificial-intelligence') expandedSlugs.add('ai');
        if (s === 'governance') expandedSlugs.add('policy-governance');
        if (s === 'policy-governance') expandedSlugs.add('governance');
        if (s === 'media-culture') {
          expandedSlugs.add('media-society');
          expandedSlugs.add('media');
        }
        if (s === 'media-society') {
          expandedSlugs.add('media-culture');
          expandedSlugs.add('media');
        }
      }

      const slugs = Array.from(expandedSlugs);
      if (slugs.length > 0) {
        values.push(slugs);
        clauses.push(
          `(
            a.category_id IN (SELECT id::text FROM categories WHERE slug = ANY($${values.length}))
            OR a.id IN (
              SELECT a2.id FROM articles a2
              JOIN categories cat ON cat.slug = ANY($${values.length})
              WHERE (a2.title ILIKE '%' || cat.name || '%'
                     OR a2.description ILIKE '%' || cat.name || '%')
                AND a2.category_id IS NULL
                AND a2.deleted_at IS NULL
            )
          )`,
        );
      }
    }

    if (filters.tagSlugs) {
      const tags = Array.isArray(filters.tagSlugs) ? filters.tagSlugs : filters.tagSlugs.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        values.push(tags);
        clauses.push(`a.tag_ids && $${values.length}`);
      }
    }

    if (filters.fromDate) {
      values.push(new Date(filters.fromDate));
      clauses.push(`COALESCE(a.published_at, a.created_at) >= $${values.length}`);
    }

    if (filters.toDate) {
      values.push(new Date(filters.toDate));
      clauses.push(`COALESCE(a.published_at, a.created_at) <= $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      clauses.push(
        `(a.title ILIKE $${values.length} OR a.description ILIKE $${values.length})`,
      );
    }

    const where = `WHERE ${clauses.join(' AND ')}`;

    const countRes = await this.postgres.pool.query<CountRow>(
      `SELECT count(*)::int AS total FROM articles a ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    let orderBy = 'ORDER BY a.created_at DESC';
    const sortOrder = filters.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (filters.sortBy === 'trending') {
      orderBy = `ORDER BY a.word_count ${sortOrder}, a.created_at ${sortOrder}`;
    } else if (filters.sortBy === 'most_discussed') {
      orderBy = `ORDER BY (SELECT COUNT(*) FROM comments c WHERE c.article_id::text = a.id::text) ${sortOrder}, a.created_at DESC`;
    } else if (filters.sortBy === 'most_liked') {
      orderBy = `ORDER BY (SELECT COUNT(*) FROM likes l WHERE l.article_id::text = a.id::text) ${sortOrder}, a.created_at DESC`;
    } else if (filters.sortBy === 'latest') {
      orderBy = `ORDER BY COALESCE(a.published_at, a.created_at) ${sortOrder}`;
    }

    const listValues = [...values, limit, offset];
    const dataRes = await this.postgres.pool.query<ArticleRow>(
      `SELECT a.*, c.slug AS category_slug, u.name AS author_name, u.avatar_url AS author_avatar 
       FROM articles a 
       LEFT JOIN categories c ON a.category_id::text = c.id::text 
       LEFT JOIN cms_users u ON a.author_id::text = u.id::text 
       ${where} ${orderBy} LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      listValues,
    );

    return {
      items: dataRes.rows.map((row) => this.toDomain(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: CreateArticleDto): Promise<Article> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<ArticleRow>(
      `
      INSERT INTO articles (
        title, slug, description, content, author_id, category_id,
        tag_ids, cover_image, status, version, word_count, reading_time_minutes,
        seo_title, seo_description, review_note, scheduled_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
      `,
      [
        data.title,
        data.slug,
        data.description || '',
        data.content || '',
        data.authorId,
        data.categoryId ?? null,
        JSON.stringify(data.tagIds ?? []),
        data.coverImage ?? null,
        data.status ?? 'draft',
        1,
        data.wordCount ?? 0,
        data.readingTimeMinutes ?? 1,
        data.seoTitle ?? null,
        data.seoDescription ?? null,
        data.reviewNote ?? null,
        data.scheduledAt ?? null,
      ],
    );
    return this.toDomain(result.rows[0]);
  }

  async update(id: string, data: UpdateArticleDto): Promise<Article> {
    await this.ensureSchema();

    const fields: string[] = ['updated_at = now()'];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      values.push(data.title);
      fields.push(`title = $${values.length}`);
    }
    if (data.slug !== undefined) {
      values.push(data.slug);
      fields.push(`slug = $${values.length}`);
    }
    if (data.description !== undefined) {
      values.push(data.description);
      fields.push(`description = $${values.length}`);
    }
    if (data.content !== undefined) {
      values.push(data.content);
      fields.push(`content = $${values.length}`);
    }
    if (data.categoryId !== undefined) {
      values.push(data.categoryId);
      fields.push(`category_id = $${values.length}`);
    }
    if (data.tagIds !== undefined) {
      values.push(JSON.stringify(data.tagIds));
      fields.push(`tag_ids = $${values.length}`);
    }
    if (data.coverImage !== undefined) {
      values.push(data.coverImage);
      fields.push(`cover_image = $${values.length}`);
    }
    if (data.status !== undefined) {
      values.push(data.status);
      fields.push(`status = $${values.length}`);
    }
    if (data.version !== undefined) {
      values.push(data.version);
      fields.push(`version = $${values.length}`);
    }
    if (data.wordCount !== undefined) {
      values.push(data.wordCount);
      fields.push(`word_count = $${values.length}`);
    }
    if (data.readingTimeMinutes !== undefined) {
      values.push(data.readingTimeMinutes);
      fields.push(`reading_time_minutes = $${values.length}`);
    }
    if (data.seoTitle !== undefined) {
      values.push(data.seoTitle);
      fields.push(`seo_title = $${values.length}`);
    }
    if (data.seoDescription !== undefined) {
      values.push(data.seoDescription);
      fields.push(`seo_description = $${values.length}`);
    }
    if (data.reviewNote !== undefined) {
      values.push(data.reviewNote);
      fields.push(`review_note = $${values.length}`);
    }
    if (data.scheduledAt !== undefined) {
      values.push(data.scheduledAt);
      fields.push(`scheduled_at = $${values.length}`);
    }
    if (data.publishedAt !== undefined) {
      values.push(data.publishedAt);
      fields.push(`published_at = $${values.length}`);
    }

    values.push(id);
    const result = await this.postgres.pool.query<ArticleRow>(
      `UPDATE articles SET ${fields.join(', ')} WHERE id = $${values.length} AND deleted_at IS NULL RETURNING *`,
      values,
    );

    if (!result.rows[0]) {
      throw new Error('Article not found');
    }

    return this.toDomain(result.rows[0]);
  }

  async softDelete(id: string): Promise<boolean> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query(
      'UPDATE articles SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateStatus(id: string, status: ContentStatus): Promise<Article> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<ArticleRow>(
      `
      UPDATE articles
      SET status = $1, published_at = CASE WHEN $1 = 'published' THEN now() ELSE published_at END, updated_at = now()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
      `,
      [status, id],
    );
    if (!result.rows[0]) {
      throw new Error('Article not found');
    }
    return this.toDomain(result.rows[0]);
  }
}
