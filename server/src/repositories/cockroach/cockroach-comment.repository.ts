import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Comment,
  CommentQueryFilters,
  CreateCommentDto,
  UpdateCommentDto,
} from '../../domain/models';
import { CommentStatus } from '../../domain/models';
import { CockroachDbService } from '../../database/cockroach.service';
import type { ICommentRepository } from '../interfaces/comment.repository.interface';

@Injectable()
export class CockroachCommentRepository implements ICommentRepository {
  constructor(private readonly cockroach: CockroachDbService) {}

  private mapRow(row: any): Comment {
    return {
      id: row.id,
      articleId: row.article_id,
      parentId: row.parent_id || null,
      authorId: row.author_id,
      authorName: row.author_name || 'Anonymous',
      authorAvatar: row.author_avatar || null,
      body: row.body || row.content || '',
      status: (row.status as CommentStatus) || CommentStatus.VISIBLE,
      moderationNote: row.moderation_note || null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    };
  }

  async findById(id: string): Promise<Comment | null> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      `SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM comments c
       LEFT JOIN cms_users u ON c.author_id = u.id
       WHERE c.id = $1 AND c.deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: CommentQueryFilters): Promise<Comment[]> {
    await this.cockroach.ensureSchema();
    const conditions: string[] = ['c.deleted_at IS NULL'];
    const params: any[] = [];
    let idx = 1;

    if (filters.articleId) {
      conditions.push(`c.article_id = $${idx++}`);
      params.push(filters.articleId);
    }
    if (filters.authorId) {
      conditions.push(`c.author_id = $${idx++}`);
      params.push(filters.authorId);
    }
    if (filters.status) {
      conditions.push(`LOWER(c.status) = LOWER($${idx++})`);
      params.push(filters.status);
    } else {
      conditions.push("LOWER(c.status) = 'visible'");
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const { rows } = await this.cockroach.pool.query(
      `SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM comments c
       LEFT JOIN cms_users u ON c.author_id = u.id
       ${whereClause}
       ORDER BY c.created_at ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return rows.map((r) => this.mapRow(r));
  }

  async create(
    dto: CreateCommentDto & { authorId: string; authorName: string; authorAvatar: string | null },
  ): Promise<Comment> {
    await this.cockroach.ensureSchema();
    const id = randomUUID();
    await this.cockroach.pool.query(
      `INSERT INTO comments (id, article_id, parent_id, author_id, author_name, author_avatar, body, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'visible')`,
      [id, dto.articleId, dto.parentId || null, dto.authorId, dto.authorName, dto.authorAvatar, dto.body],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, dto: UpdateCommentDto): Promise<Comment> {
    await this.cockroach.ensureSchema();
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (dto.body !== undefined) {
      updates.push(`body = $${idx++}`);
      params.push(dto.body);
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(dto.status);
    }
    if (dto.moderationNote !== undefined) {
      updates.push(`moderation_note = $${idx++}`);
      params.push(dto.moderationNote);
    }

    if (updates.length > 0) {
      updates.push('updated_at = now()');
      params.push(id);
      await this.cockroach.pool.query(
        `UPDATE comments SET ${updates.join(', ')} WHERE id = $${idx}`,
        params,
      );
    }

    return (await this.findById(id))!;
  }

  async softDelete(id: string): Promise<boolean> {
    await this.cockroach.ensureSchema();
    const { rowCount } = await this.cockroach.pool.query(
      "UPDATE comments SET deleted_at = now(), status = 'removed' WHERE id = $1 AND deleted_at IS NULL",
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      "SELECT COUNT(*) as total FROM comments WHERE article_id = $1 AND deleted_at IS NULL AND LOWER(status) = 'visible'",
      [articleId],
    );
    return parseInt(rows[0]?.total || '0', 10);
  }
}
