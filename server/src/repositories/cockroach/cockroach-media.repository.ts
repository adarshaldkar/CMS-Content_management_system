import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CreateMediaDto, Media, PaginatedResult } from '../../domain/models';
import { CockroachDbService } from '../../database/cockroach.service';
import type { IMediaRepository, MediaFilters } from '../interfaces/media.repository.interface';

@Injectable()
export class CockroachMediaRepository implements IMediaRepository {
  constructor(private readonly cockroach: CockroachDbService) {}

  private mapRow(row: any): Media {
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.original_name || row.filename,
      mimeType: row.mime_type,
      size: Number(row.size_bytes || row.size || 0),
      url: row.url,
      uploadedBy: row.uploaded_by || row.uploader_id,
      variants: typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants || undefined,
      optimization: typeof row.optimization === 'string' ? JSON.parse(row.optimization) : row.optimization || undefined,
      processingStatus: row.processing_status || 'READY',
      aspectRatio: row.aspect_ratio != null ? Number(row.aspect_ratio) : undefined,
      usageProfile: row.usage_profile || undefined,
      storageKey: row.storage_key || undefined,
      cdnUrl: row.cdn_url || undefined,
      createdAt: new Date(row.created_at),
    };
  }

  async findById(id: string): Promise<Media | null> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM media_assets WHERE id = $1 LIMIT 1',
      [id],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: MediaFilters): Promise<PaginatedResult<Media>> {
    await this.cockroach.ensureSchema();
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.uploadedBy) {
      conditions.push(`(uploaded_by = $${idx} OR uploader_id = $${idx})`);
      idx++;
      params.push(filters.uploadedBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows: countRows } = await this.cockroach.pool.query(
      `SELECT COUNT(*) as total FROM media_assets ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0]?.total || '0', 10);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const { rows } = await this.cockroach.pool.query(
      `SELECT * FROM media_assets ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return {
      items: rows.map((r) => this.mapRow(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: CreateMediaDto): Promise<Media> {
    await this.cockroach.ensureSchema();
    const id = randomUUID();
    await this.cockroach.pool.query(
      `INSERT INTO media_assets (id, filename, original_name, mime_type, size_bytes, url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        data.filename,
        data.originalName,
        data.mimeType,
        data.size,
        data.url,
        data.uploadedBy,
      ],
    );
    if (data.processingStatus || data.variants || data.optimization || data.aspectRatio || data.usageProfile || data.storageKey || data.cdnUrl) {
      await this.update(id, {
        processingStatus: data.processingStatus,
        variants: data.variants,
        optimization: data.optimization,
        aspectRatio: data.aspectRatio,
        usageProfile: data.usageProfile,
        storageKey: data.storageKey,
        cdnUrl: data.cdnUrl,
      });
    }
    return (await this.findById(id))!;
  }

  async update(id: string, updates: Partial<Media>): Promise<Media | null> {
    await this.cockroach.ensureSchema();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      filename: 'filename',
      originalName: 'original_name',
      mimeType: 'mime_type',
      size: 'size_bytes',
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

    if (setClauses.length > 0) {
      try {
        values.push(id);
        await this.cockroach.pool.query(
          `UPDATE media_assets SET ${setClauses.join(', ')} WHERE id = $${idx}`,
          values,
        );
      } catch (err: any) {
        // If optional columns do not exist yet in table schema, ignore silently
      }
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    await this.cockroach.ensureSchema();
    const { rowCount } = await this.cockroach.pool.query(
      'DELETE FROM media_assets WHERE id = $1',
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
