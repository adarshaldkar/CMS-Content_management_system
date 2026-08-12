import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type {
  Comment,
  CommentQueryFilters,
  CreateCommentDto,
  UpdateCommentDto,
} from '../../domain/models';
import { CommentStatus } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { ICommentRepository } from '../interfaces/comment.repository.interface';

interface CommentRow extends QueryResultRow {
  id: string;
  article_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  body: string;
  status: string;
  moderation_note: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

@Injectable()
export class PostgresCommentRepository implements ICommentRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE TABLE IF NOT EXISTS comments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          article_id text NOT NULL,
          parent_id text,
          author_id text NOT NULL,
          author_name text NOT NULL,
          author_avatar text,
          body text NOT NULL,
          status text NOT NULL DEFAULT 'visible',
          moderation_note text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        );
        CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
        CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
        `,
      )
      .then(() => undefined);
    return this.ready;
  }

  private toDomain(row: CommentRow): Comment {
    return {
      id: row.id,
      articleId: row.article_id,
      parentId: row.parent_id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorAvatar: row.author_avatar,
      body: row.body,
      status: row.status as CommentStatus,
      moderationNote: row.moderation_note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  async findById(id: string): Promise<Comment | null> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<CommentRow>(
      `SELECT * FROM comments WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findMany(filters: CommentQueryFilters): Promise<Comment[]> {
    await this.ensureSchema();
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let i = 1;

    if (filters.articleId) {
      conditions.push(`article_id = $${i++}`);
      params.push(filters.articleId);
    }
    if (filters.authorId) {
      conditions.push(`author_id = $${i++}`);
      params.push(filters.authorId);
    }
    if (filters.status) {
      conditions.push(`status = $${i++}`);
      params.push(filters.status);
    } else {
      conditions.push(`status = 'visible'`);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const { rows } = await this.postgres.pool.query<CommentRow>(
      `SELECT * FROM comments WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC LIMIT $${i++} OFFSET $${i}`,
      [...params, limit, offset],
    );
    return rows.map((r) => this.toDomain(r));
  }

  async create(
    dto: CreateCommentDto & { authorId: string; authorName: string; authorAvatar: string | null },
  ): Promise<Comment> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<CommentRow>(
      `INSERT INTO comments (article_id, parent_id, author_id, author_name, author_avatar, body)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [dto.articleId, dto.parentId || null, dto.authorId, dto.authorName, dto.authorAvatar, dto.body],
    );
    return this.toDomain(rows[0]);
  }

  async update(id: string, dto: UpdateCommentDto): Promise<Comment> {
    await this.ensureSchema();
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (dto.body !== undefined) { sets.push(`body = $${i++}`); params.push(dto.body); }
    if (dto.status !== undefined) { sets.push(`status = $${i++}`); params.push(dto.status); }
    if (dto.moderationNote !== undefined) { sets.push(`moderation_note = $${i++}`); params.push(dto.moderationNote); }
    sets.push(`updated_at = now()`);

    const { rows } = await this.postgres.pool.query<CommentRow>(
      `UPDATE comments SET ${sets.join(', ')} WHERE id = $${i++} RETURNING *`,
      [...params, id],
    );
    return this.toDomain(rows[0]);
  }

  async softDelete(id: string): Promise<boolean> {
    await this.ensureSchema();
    const { rowCount } = await this.postgres.pool.query(
      `UPDATE comments SET deleted_at = now(), status = 'removed' WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM comments WHERE article_id = $1 AND deleted_at IS NULL AND status = 'visible'`,
      [articleId],
    );
    return parseInt(rows[0]?.total ?? '0', 10);
  }
}
