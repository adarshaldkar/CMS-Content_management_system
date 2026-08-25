import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Like, CreateLikeDto } from '../../domain/models';
import { CockroachDbService } from '../../database/cockroach.service';
import type { ILikeRepository } from '../interfaces/like.repository.interface';

@Injectable()
export class CockroachLikeRepository implements ILikeRepository {
  constructor(private readonly cockroach: CockroachDbService) {}

  async findOne(userId: string, articleId: string): Promise<Like | null> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM likes WHERE user_id = $1 AND article_id = $2 LIMIT 1',
      [userId, articleId],
    );
    if (!rows || rows.length === 0) return null;
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      articleId: rows[0].article_id,
      createdAt: new Date(rows[0].created_at),
    };
  }

  async create(dto: CreateLikeDto): Promise<Like> {
    await this.cockroach.ensureSchema();
    const id = randomUUID();
    await this.cockroach.pool.query(
      `INSERT INTO likes (id, user_id, article_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, article_id) DO NOTHING`,
      [id, dto.userId, dto.articleId],
    );
    return (await this.findOne(dto.userId, dto.articleId))!;
  }

  async delete(userId: string, articleId: string): Promise<boolean> {
    await this.cockroach.ensureSchema();
    const { rowCount } = await this.cockroach.pool.query(
      'DELETE FROM likes WHERE user_id = $1 AND article_id = $2',
      [userId, articleId],
    );
    return (rowCount ?? 0) > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT COUNT(*) as total FROM likes WHERE article_id = $1',
      [articleId],
    );
    return parseInt(rows[0]?.total || '0', 10);
  }
}
