import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { ArticleRevision, CreateRevisionDto } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { IRevisionRepository } from '../interfaces/revision.repository.interface';

interface RevisionRow extends QueryResultRow {
  id: string;
  article_id: string;
  version: number;
  title: string;
  description: string;
  content: string;
  author_id: string;
  change_summary: string | null;
  created_at: Date;
}

@Injectable()
export class PostgresRevisionRepository implements IRevisionRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS cms_article_revisions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          article_id text NOT NULL,
          version int NOT NULL,
          title text NOT NULL,
          description text NOT NULL DEFAULT '',
          content text NOT NULL DEFAULT '',
          author_id text NOT NULL,
          change_summary text,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_revisions_article_id ON cms_article_revisions(article_id);
        CREATE INDEX IF NOT EXISTS idx_revisions_created ON cms_article_revisions(created_at DESC);
      `,
      )
      .then(() => undefined);

    await this.ready;
  }

  private toDomain(row: RevisionRow): ArticleRevision {
    return {
      id: row.id,
      articleId: row.article_id,
      version: row.version,
      title: row.title,
      description: row.description,
      content: row.content,
      authorId: row.author_id,
      changeSummary: row.change_summary,
      createdAt: row.created_at,
    };
  }

  async create(data: CreateRevisionDto): Promise<ArticleRevision> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<RevisionRow>(
      `
      INSERT INTO cms_article_revisions (
        article_id, version, title, description, content, author_id, change_summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        data.articleId,
        data.version,
        data.title,
        data.description,
        data.content,
        data.authorId,
        data.changeSummary ?? null,
      ],
    );
    return this.toDomain(result.rows[0]);
  }

  async findByArticleId(articleId: string): Promise<ArticleRevision[]> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<RevisionRow>(
      'SELECT * FROM cms_article_revisions WHERE article_id = $1 ORDER BY version DESC',
      [articleId],
    );
    return result.rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<ArticleRevision | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<RevisionRow>(
      'SELECT * FROM cms_article_revisions WHERE id = $1',
      [id],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }
}
