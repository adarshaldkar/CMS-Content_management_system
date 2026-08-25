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
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: Number(row.size_bytes || row.size || 0),
      url: row.url,
      uploadedBy: row.uploaded_by,
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
      conditions.push(`uploaded_by = $${idx++}`);
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
    return (await this.findById(id))!;
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
