import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { Bookmark, CreateBookmarkDto, PaginatedResult } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { IBookmarkRepository } from '../interfaces/bookmark.repository.interface';

interface BookmarkRow extends QueryResultRow {
  id: string;
  user_id: string;
  article_id: string;
  created_at: Date;
  article_title?: string;
  article_slug?: string;
  article_description?: string;
  article_cover_image?: string;
  article_reading_time_minutes?: number;
  article_category?: string;
  article_author_name?: string;
  article_created_at?: Date;
}

@Injectable()
export class PostgresBookmarkRepository implements IBookmarkRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE TABLE IF NOT EXISTS bookmarks (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text NOT NULL,
          article_id text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(user_id, article_id)
        );
        CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
        `,
      )
      .then(() => undefined);
    return this.ready;
  }

  private toDomain(row: BookmarkRow): Bookmark {
    return {
      id: row.id,
      userId: row.user_id,
      articleId: row.article_id,
      createdAt: row.created_at,
      article: row.article_title ? {
        id: row.article_id,
        title: row.article_title,
        slug: row.article_slug || '',
        description: row.article_description || null,
        coverImage: row.article_cover_image || null,
        readingTimeMinutes: row.article_reading_time_minutes || 1,
        category: row.article_category || null,
        authorName: row.article_author_name || null,
        createdAt: row.article_created_at,
      } : undefined,
    };
  }

  async findByUser(userId: string, page: number, limit: number): Promise<PaginatedResult<Bookmark>> {
    await this.ensureSchema();
    const offset = (page - 1) * limit;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      this.postgres.pool.query<BookmarkRow>(
        `SELECT b.id, b.user_id, b.article_id, b.created_at,
                a.title as article_title, a.slug as article_slug, a.description as article_description,
                a.cover_image as article_cover_image, a.reading_time_minutes as article_reading_time_minutes,
                a.category_id as article_category, a.author_id as article_author_name, a.created_at as article_created_at
         FROM bookmarks b
         LEFT JOIN articles a ON b.article_id = a.id::text
         WHERE b.user_id = $1
         ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      this.postgres.pool.query<{ total: string }>(
        `SELECT COUNT(*) as total FROM bookmarks WHERE user_id = $1`,
        [userId],
      ),
    ]);
    const total = parseInt(countRows[0]?.total ?? '0', 10);
    return {
      items: rows.map((r) => this.toDomain(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(userId: string, articleId: string): Promise<Bookmark | null> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<BookmarkRow>(
      `SELECT * FROM bookmarks WHERE user_id = $1 AND article_id = $2`,
      [userId, articleId],
    );
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async create(dto: CreateBookmarkDto): Promise<Bookmark> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<BookmarkRow>(
      `INSERT INTO bookmarks (user_id, article_id) VALUES ($1, $2)
       ON CONFLICT (user_id, article_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [dto.userId, dto.articleId],
    );
    return this.toDomain(rows[0]);
  }

  async delete(userId: string, articleId: string): Promise<boolean> {
    await this.ensureSchema();
    const { rowCount } = await this.postgres.pool.query(
      `DELETE FROM bookmarks WHERE user_id = $1 AND article_id = $2`,
      [userId, articleId],
    );
    return (rowCount ?? 0) > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM bookmarks WHERE article_id = $1`,
      [articleId],
    );
    return parseInt(rows[0]?.total ?? '0', 10);
  }
}
