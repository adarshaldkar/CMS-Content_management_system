import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { CreateMediaDto, Media, PaginatedResult } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type {
  IMediaRepository,
  MediaFilters,
} from '../interfaces/media.repository.interface';

interface MediaRow extends QueryResultRow {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number | string;
  url: string;
  uploaded_by: string;
  created_at: Date;
}

interface CountRow extends QueryResultRow {
  total: number;
}

@Injectable()
export class PostgresMediaRepository implements IMediaRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS cms_media (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          filename text NOT NULL,
          original_name text NOT NULL,
          mime_type text NOT NULL,
          size bigint NOT NULL,
          url text NOT NULL,
          uploaded_by text NOT NULL,
          variants jsonb DEFAULT '[]'::jsonb,
          optimization jsonb,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;
        ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS optimization jsonb;

        CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON cms_media(uploaded_by);
        CREATE INDEX IF NOT EXISTS idx_media_created_at ON cms_media(created_at DESC);
      `,
      )
      .then(() => undefined);

    await this.ready;
  }

  private toDomain(row: any): Media {
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: Number(row.size),
      url: row.url,
      uploadedBy: row.uploaded_by,
      variants: row.variants || undefined,
      optimization: row.optimization || undefined,
      createdAt: row.created_at,
    };
  }

  async create(data: CreateMediaDto): Promise<Media> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<MediaRow>(
      `
      INSERT INTO cms_media (
        filename, original_name, mime_type, size, url, uploaded_by, variants, optimization
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        data.filename,
        data.originalName,
        data.mimeType,
        data.size,
        data.url,
        data.uploadedBy,
        JSON.stringify(data.variants || []),
        data.optimization ? JSON.stringify(data.optimization) : null,
      ],
    );
    return this.toDomain(result.rows[0]);
  }

  async findById(id: string): Promise<Media | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<MediaRow>(
      'SELECT * FROM cms_media WHERE id = $1',
      [id],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findMany(filters: MediaFilters): Promise<PaginatedResult<Media>> {
    await this.ensureSchema();
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 24, 100);
    const offset = (page - 1) * limit;

    const values: unknown[] = [];
    const clauses: string[] = [];

    if (filters.uploadedBy) {
      values.push(filters.uploadedBy);
      clauses.push(`uploaded_by = $${values.length}`);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const countRes = await this.postgres.pool.query<CountRow>(
      `SELECT count(*)::int AS total FROM cms_media ${where}`,
      values,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const listValues = [...values, limit, offset];
    const dataRes = await this.postgres.pool.query<MediaRow>(
      `SELECT * FROM cms_media ${where} ORDER BY created_at DESC LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      listValues,
    );

    return {
      items: dataRes.rows.map((row) => this.toDomain(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async delete(id: string): Promise<boolean> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query(
      'DELETE FROM cms_media WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
