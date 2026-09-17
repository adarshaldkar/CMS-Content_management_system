import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Bookmark, CreateBookmarkDto, PaginatedResult } from '../../domain/models';
import { MariaDbService } from '../../database/mariadb.service';
import type { IBookmarkRepository } from '../interfaces/bookmark.repository.interface';

@Injectable()
export class MariaDbBookmarkRepository implements IBookmarkRepository {
  constructor(private readonly mariadb: MariaDbService) {}

  private mapRow(row: any): Bookmark {
    return {
      id: row.id,
      userId: row.user_id,
      articleId: row.article_id,
      createdAt: new Date(row.created_at),
      article: row.article_title ? {
        id: row.article_id,
        title: row.article_title,
        slug: row.article_slug || '',
        description: row.article_description || null,
        coverImage: row.article_cover_image || null,
        readingTimeMinutes: row.article_reading_time_minutes || 1,
        category: row.article_category || null,
        authorName: row.article_author_name || null,
        createdAt: row.article_created_at ? new Date(row.article_created_at) : undefined,
      } : undefined,
    };
  }

  async findByUser(userId: string, page: number, limit: number): Promise<PaginatedResult<Bookmark>> {
    await this.mariadb.ensureSchema();
    const offset = (page - 1) * limit;

    const [countRows] = (await this.mariadb.pool.query(
      'SELECT COUNT(*) as total FROM bookmarks WHERE user_id = ?',
      [userId],
    )) as any;
    const total = countRows[0]?.total || 0;

    const [rows] = (await this.mariadb.pool.query(
      `SELECT b.id, b.user_id, b.article_id, b.created_at,
              a.title as article_title, a.slug as article_slug, a.description as article_description,
              a.cover_image as article_cover_image, a.reading_time_minutes as article_reading_time_minutes,
              a.category_id as article_category, a.author_id as article_author_name, a.created_at as article_created_at
       FROM bookmarks b
       LEFT JOIN articles a ON b.article_id = a.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    )) as any;

    return {
      items: (rows || []).map((r: any) => this.mapRow(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(userId: string, articleId: string): Promise<Bookmark | null> {
    await this.mariadb.ensureSchema();
    const [rows] = (await this.mariadb.pool.query(
      'SELECT * FROM bookmarks WHERE user_id = ? AND article_id = ? LIMIT 1',
      [userId, articleId],
    )) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateBookmarkDto): Promise<Bookmark> {
    await this.mariadb.ensureSchema();
    const id = randomUUID();
    await this.mariadb.pool.query(
      `INSERT INTO bookmarks (id, user_id, article_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE created_at = created_at`,
      [id, dto.userId, dto.articleId],
    );
    return (await this.findOne(dto.userId, dto.articleId))!;
  }

  async delete(userId: string, articleId: string): Promise<boolean> {
    await this.mariadb.ensureSchema();
    const [res] = (await this.mariadb.pool.query(
      'DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?',
      [userId, articleId],
    )) as any;
    return res?.affectedRows > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    await this.mariadb.ensureSchema();
    const [rows] = (await this.mariadb.pool.query(
      'SELECT COUNT(*) as total FROM bookmarks WHERE article_id = ?',
      [articleId],
    )) as any;
    return rows[0]?.total || 0;
  }
}
