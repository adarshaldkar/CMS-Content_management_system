import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CreateMediaDto, Media, PaginatedResult } from '../../domain/models';
import { MySqlService } from '../../database/mysql.service';
import type { IMediaRepository, MediaFilters } from '../interfaces/media.repository.interface';

@Injectable()
export class MySqlMediaRepository implements IMediaRepository {
  constructor(private readonly mysql: MySqlService) {}

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
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      'SELECT * FROM media_assets WHERE id = ? LIMIT 1',
      [id],
    )) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: MediaFilters): Promise<PaginatedResult<Media>> {
    await this.mysql.ensureSchema();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.uploadedBy) {
      conditions.push('(uploaded_by = ? OR uploader_id = ?)');
      params.push(filters.uploadedBy, filters.uploadedBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = (await this.mysql.pool.query(
      `SELECT COUNT(*) as total FROM media_assets ${whereClause}`,
      params,
    )) as any;
    const total = countRows[0]?.total || 0;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const [rows] = (await this.mysql.pool.query(
      `SELECT * FROM media_assets ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )) as any;

    return {
      items: (rows || []).map((r: any) => this.mapRow(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: CreateMediaDto): Promise<Media> {
    await this.mysql.ensureSchema();
    const id = data.id || randomUUID();
    await this.mysql.pool.query(
      `INSERT INTO media_assets (id, filename, original_name, mime_type, size_bytes, url, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         filename = VALUES(filename),
         original_name = VALUES(original_name),
         mime_type = VALUES(mime_type),
         size_bytes = VALUES(size_bytes),
         url = VALUES(url),
         uploaded_by = VALUES(uploaded_by)`,
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
    await this.mysql.ensureSchema();
    const setClauses: string[] = [];
    const values: unknown[] = [];

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
        setClauses.push('variants = ?');
        values.push(JSON.stringify(val));
      } else if (key === 'optimization') {
        setClauses.push('optimization = ?');
        values.push(val ? JSON.stringify(val) : null);
      } else if (fieldMap[key]) {
        setClauses.push(`${fieldMap[key]} = ?`);
        values.push(val);
      }
    }

    if (setClauses.length > 0) {
      try {
        values.push(id);
        await this.mysql.pool.query(
          `UPDATE media_assets SET ${setClauses.join(', ')} WHERE id = ?`,
          values,
        );
      } catch (err: any) {
        // If optional columns do not exist yet in table schema, ignore silently
      }
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    await this.mysql.ensureSchema();
    const [res] = (await this.mysql.pool.query(
      'DELETE FROM media_assets WHERE id = ?',
      [id],
    )) as any;
    return res?.affectedRows > 0;
  }
}
