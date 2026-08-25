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
      `SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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
