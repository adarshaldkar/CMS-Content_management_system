import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { Like, CreateLikeDto } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { ILikeRepository } from '../interfaces/like.repository.interface';

interface LikeRow extends QueryResultRow {
  id: string;
  user_id: string;
  article_id: string;
  created_at: Date;
}

@Injectable()
export class PostgresLikeRepository implements ILikeRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE TABLE IF NOT EXISTS article_likes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text NOT NULL,
          article_id text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(user_id, article_id)
        );
        CREATE INDEX IF NOT EXISTS idx_likes_article_id ON article_likes(article_id);
        `,
      )
      .then(() => undefined);
    return this.ready;
  }

  private toDomain(row: LikeRow): Like {
    return {
      id: row.id,
      userId: row.user_id,
      articleId: row.article_id,
      createdAt: row.created_at,
    };
  }

  async findOne(userId: string, articleId: string): Promise<Like | null> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<LikeRow>(
      `SELECT * FROM article_likes WHERE user_id = $1 AND article_id = $2`,
      [userId, articleId],
    );
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async create(dto: CreateLikeDto): Promise<Like> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<LikeRow>(
      `INSERT INTO article_likes (user_id, article_id) VALUES ($1, $2)
       ON CONFLICT (user_id, article_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [dto.userId, dto.articleId],
    );
    return this.toDomain(rows[0]);
  }

  async delete(userId: string, articleId: string): Promise<boolean> {
    await this.ensureSchema();
    const { rowCount } = await this.postgres.pool.query(
      `DELETE FROM article_likes WHERE user_id = $1 AND article_id = $2`,
      [userId, articleId],
    );
    return (rowCount ?? 0) > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM article_likes WHERE article_id = $1`,
      [articleId],
    );
    return parseInt(rows[0]?.total ?? '0', 10);
  }
}
