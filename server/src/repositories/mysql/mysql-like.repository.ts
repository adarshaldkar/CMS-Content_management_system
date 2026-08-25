import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Like, CreateLikeDto } from '../../domain/models';
import { MySqlService } from '../../database/mysql.service';
import type { ILikeRepository } from '../interfaces/like.repository.interface';

@Injectable()
export class MySqlLikeRepository implements ILikeRepository {
  constructor(private readonly mysql: MySqlService) {}

  async findOne(userId: string, articleId: string): Promise<Like | null> {
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      'SELECT * FROM likes WHERE user_id = ? AND article_id = ? LIMIT 1',
      [userId, articleId],
    )) as any;
    if (!rows || rows.length === 0) return null;
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      articleId: rows[0].article_id,
      createdAt: new Date(rows[0].created_at),
    };
  }

  async create(dto: CreateLikeDto): Promise<Like> {
    await this.mysql.ensureSchema();
    const id = randomUUID();
    await this.mysql.pool.query(
      `INSERT INTO likes (id, user_id, article_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE created_at = created_at`,
      [id, dto.userId, dto.articleId],
    );
    return (await this.findOne(dto.userId, dto.articleId))!;
  }

  async delete(userId: string, articleId: string): Promise<boolean> {
    await this.mysql.ensureSchema();
    const [res] = (await this.mysql.pool.query(
      'DELETE FROM likes WHERE user_id = ? AND article_id = ?',
      [userId, articleId],
    )) as any;
    return res?.affectedRows > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      'SELECT COUNT(*) as total FROM likes WHERE article_id = ?',
      [articleId],
    )) as any;
    return rows[0]?.total || 0;
  }
}
