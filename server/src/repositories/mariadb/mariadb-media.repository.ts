import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { CreateMediaDto, Media, PaginatedResult } from '../../domain/models';
import { MariaDbService } from '../../database/mariadb.service';
import type { IMediaRepository, MediaFilters } from '../interfaces/media.repository.interface';

@Injectable()
export class MariaDbMediaRepository implements IMediaRepository {
  constructor(private readonly mariadb: MariaDbService) {}

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
    await this.mariadb.ensureSchema();
    const [rows] = (await this.mariadb.pool.query(
      'SELECT * FROM media_assets WHERE id = ? LIMIT 1',
      [id],
    )) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: MediaFilters): Promise<PaginatedResult<Media>> {
    await this.mariadb.ensureSchema();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.uploadedBy) {
      conditions.push('uploaded_by = ?');
      params.push(filters.uploadedBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = (await this.mariadb.pool.query(
      `SELECT COUNT(*) as total FROM media_assets ${whereClause}`,
      params,
    )) as any;
    const total = countRows[0]?.total || 0;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const [rows] = (await this.mariadb.pool.query(
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
    await this.mariadb.ensureSchema();
    const id = randomUUID();
    await this.mariadb.pool.query(
      `INSERT INTO media_assets (id, filename, original_name, mime_type, size_bytes, url, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
    await this.mariadb.ensureSchema();
    const [res] = (await this.mariadb.pool.query(
      'DELETE FROM media_assets WHERE id = ?',
      [id],
    )) as any;
    return res?.affectedRows > 0;
  }
}
