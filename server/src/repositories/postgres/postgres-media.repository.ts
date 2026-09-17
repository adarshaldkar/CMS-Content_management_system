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
        ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'READY';
        ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS aspect_ratio numeric;
        ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS usage_profile text;
        ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS storage_key text;
        ALTER TABLE cms_media ADD COLUMN IF NOT EXISTS cdn_url text;

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
      processingStatus: row.processing_status || 'READY',
      aspectRatio: row.aspect_ratio != null ? Number(row.aspect_ratio) : undefined,
      usageProfile: row.usage_profile || undefined,
      storageKey: row.storage_key || undefined,
      cdnUrl: row.cdn_url || undefined,
      createdAt: row.created_at,
    };
  }

  async create(data: CreateMediaDto): Promise<Media> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<MediaRow>(
      `
      INSERT INTO cms_media (
        filename, original_name, mime_type, size, url, uploaded_by, variants, optimization,
        processing_status, aspect_ratio, usage_profile, storage_key, cdn_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        data.processingStatus || 'READY',
        data.aspectRatio ?? null,
        data.usageProfile ?? null,
        data.storageKey ?? null,
        data.cdnUrl ?? null,
      ],
    );
    return this.toDomain(result.rows[0]);
  }

  async update(id: string, updates: Partial<Media>): Promise<Media | null> {
    await this.ensureSchema();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      filename: 'filename',
      originalName: 'original_name',
      mimeType: 'mime_type',
      size: 'size',
      url: 'url',
      uploadedBy: 'uploaded_by',
      processingStatus: 'processing_status',
      aspectRatio: 'aspect_ratio',
      usageProfile: 'usage_profile',
      storageKey: 'storage_key',
      cdnUrl: 'cdn_url',
    };

    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined) continue;
      if (key === 'variants') {
        setClauses.push(`variants = $${idx++}`);
        values.push(JSON.stringify(val));
      } else if (key === 'optimization') {
        setClauses.push(`optimization = $${idx++}`);
        values.push(val ? JSON.stringify(val) : null);
      } else if (fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = $${idx++}`);
        values.push(val);
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await this.postgres.pool.query<MediaRow>(
      `UPDATE cms_media SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
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
