import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Bookmark, CreateBookmarkDto, PaginatedResult } from '../../domain/models';
import { CockroachDbService } from '../../database/cockroach.service';
import type { IBookmarkRepository } from '../interfaces/bookmark.repository.interface';

@Injectable()
export class CockroachBookmarkRepository implements IBookmarkRepository {
  constructor(private readonly cockroach: CockroachDbService) {}

  private mapRow(row: any): Bookmark {
    return {
      id: row.id,
      userId: row.user_id,
      articleId: row.article_id,
      createdAt: new Date(row.created_at),
    };
  }

  async findByUser(userId: string, page: number, limit: number): Promise<PaginatedResult<Bookmark>> {
    await this.cockroach.ensureSchema();
    const offset = (page - 1) * limit;

    const { rows: countRows } = await this.cockroach.pool.query(
      'SELECT COUNT(*) as total FROM bookmarks WHERE user_id = $1',
      [userId],
    );
    const total = parseInt(countRows[0]?.total || '0', 10);

    const { rows } = await this.cockroach.pool.query(
      `SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    return {
      items: rows.map((r) => this.mapRow(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(userId: string, articleId: string): Promise<Bookmark | null> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM bookmarks WHERE user_id = $1 AND article_id = $2 LIMIT 1',
      [userId, articleId],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateBookmarkDto): Promise<Bookmark> {
    await this.cockroach.ensureSchema();
    const id = randomUUID();
    await this.cockroach.pool.query(
      `INSERT INTO bookmarks (id, user_id, article_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, article_id) DO NOTHING`,
      [id, dto.userId, dto.articleId],
    );
    return (await this.findOne(dto.userId, dto.articleId))!;
  }

  async delete(userId: string, articleId: string): Promise<boolean> {
    await this.cockroach.ensureSchema();
    const { rowCount } = await this.cockroach.pool.query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND article_id = $2',
      [userId, articleId],
    );
    return (rowCount ?? 0) > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT COUNT(*) as total FROM bookmarks WHERE article_id = $1',
      [articleId],
    );
    return parseInt(rows[0]?.total || '0', 10);
  }
}
