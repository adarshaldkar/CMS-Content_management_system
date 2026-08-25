import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ArticleRevision, CreateRevisionDto } from '../../domain/models';
import { CockroachDbService } from '../../database/cockroach.service';
import type { IRevisionRepository } from '../interfaces/revision.repository.interface';

@Injectable()
export class CockroachRevisionRepository implements IRevisionRepository {
  constructor(private readonly cockroach: CockroachDbService) {}

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
    await this.cockroach.ensureSchema();
    const id = randomUUID();
    await this.cockroach.pool.query(
      `INSERT INTO article_revisions (id, article_id, version, title, description, content, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
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
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM article_revisions WHERE article_id = $1 ORDER BY version DESC',
      [articleId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id: string): Promise<ArticleRevision | null> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM article_revisions WHERE id = $1 LIMIT 1',
      [id],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }
}
