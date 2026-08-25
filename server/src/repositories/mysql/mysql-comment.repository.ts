import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Comment,
  CommentQueryFilters,
  CreateCommentDto,
  UpdateCommentDto,
} from '../../domain/models';
import { CommentStatus } from '../../domain/models';
import { MySqlService } from '../../database/mysql.service';
import type { ICommentRepository } from '../interfaces/comment.repository.interface';

@Injectable()
export class MySqlCommentRepository implements ICommentRepository {
  constructor(private readonly mysql: MySqlService) {}

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
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      `SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM comments c
       LEFT JOIN cms_users u ON c.author_id = u.id
       WHERE c.id = ? AND c.deleted_at IS NULL LIMIT 1`,
      [id],
    )) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: CommentQueryFilters): Promise<Comment[]> {
    await this.mysql.ensureSchema();
    const conditions: string[] = ['c.deleted_at IS NULL'];
    const params: any[] = [];

    if (filters.articleId) {
      conditions.push('c.article_id = ?');
      params.push(filters.articleId);
    }
    if (filters.authorId) {
      conditions.push('c.author_id = ?');
      params.push(filters.authorId);
    }
    if (filters.status) {
      conditions.push('c.status = ?');
      params.push(filters.status);
    } else {
      conditions.push("c.status = 'visible'");
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const [rows] = (await this.mysql.pool.query(
      `SELECT c.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM comments c
       LEFT JOIN cms_users u ON c.author_id = u.id
       ${whereClause}
       ORDER BY c.created_at ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )) as any;

    return (rows || []).map((r: any) => this.mapRow(r));
  }

  async create(
    dto: CreateCommentDto & { authorId: string; authorName: string; authorAvatar: string | null },
  ): Promise<Comment> {
    await this.mysql.ensureSchema();
    const id = randomUUID();
    await this.mysql.pool.query(
      `INSERT INTO comments (id, article_id, parent_id, author_id, author_name, author_avatar, body, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'visible')`,
      [id, dto.articleId, dto.parentId || null, dto.authorId, dto.authorName, dto.authorAvatar, dto.body],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, dto: UpdateCommentDto): Promise<Comment> {
    await this.mysql.ensureSchema();
    const updates: string[] = [];
    const params: any[] = [];

    if (dto.body !== undefined) {
      updates.push('body = ?');
      params.push(dto.body);
    }
    if (dto.status !== undefined) {
      updates.push('status = ?');
      params.push(dto.status);
    }
    if (dto.moderationNote !== undefined) {
      updates.push('moderation_note = ?');
      params.push(dto.moderationNote);
    }

    if (updates.length > 0) {
      await this.mysql.pool.query(
        `UPDATE comments SET ${updates.join(', ')} WHERE id = ?`,
        [...params, id],
      );
    }

    return (await this.findById(id))!;
  }

  async softDelete(id: string): Promise<boolean> {
    await this.mysql.ensureSchema();
    const [res] = (await this.mysql.pool.query(
      "UPDATE comments SET deleted_at = NOW(), status = 'removed' WHERE id = ? AND deleted_at IS NULL",
      [id],
    )) as any;
    return res?.affectedRows > 0;
  }

  async countByArticle(articleId: string): Promise<number> {
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      "SELECT COUNT(*) as total FROM comments WHERE article_id = ? AND deleted_at IS NULL AND status = 'visible'",
      [articleId],
    )) as any;
    return rows[0]?.total || 0;
  }
}
