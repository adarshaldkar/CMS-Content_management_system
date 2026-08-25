import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ArticleRevision, CreateRevisionDto } from '../../domain/models';
import { MySqlService } from '../../database/mysql.service';
import type { IRevisionRepository } from '../interfaces/revision.repository.interface';

@Injectable()
export class MySqlRevisionRepository implements IRevisionRepository {
  constructor(private readonly mysql: MySqlService) {}

  private mapRow(row: any): ArticleRevision {
    return {
      id: row.id,
      articleId: row.article_id,
      version: row.version,
      title: row.title,
      description: row.description || '',
      content: row.content || '',
      authorId: row.author_id || row.created_by || '',
      changeSummary: row.change_summary || null,
      createdAt: new Date(row.created_at),
    };
  }

  async create(data: CreateRevisionDto): Promise<ArticleRevision> {
    await this.mysql.ensureSchema();
    const id = randomUUID();
    await this.mysql.pool.query(
      `INSERT INTO article_revisions (id, article_id, version, title, description, content, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.articleId,
        data.version,
        data.title,
        data.description || '',
        data.content || '',
        data.authorId,
      ],
    );
    return (await this.findById(id))!;
  }

  async findByArticleId(articleId: string): Promise<ArticleRevision[]> {
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      'SELECT * FROM article_revisions WHERE article_id = ? ORDER BY version DESC',
      [articleId],
    )) as any;
    return (rows || []).map((r: any) => this.mapRow(r));
  }

  async findById(id: string): Promise<ArticleRevision | null> {
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      'SELECT * FROM article_revisions WHERE id = ? LIMIT 1',
      [id],
    )) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }
}
