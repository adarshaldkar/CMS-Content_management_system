import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Category,
  CategoryQueryFilters,
  CreateCategoryDto,
  PaginatedResult,
  UpdateCategoryDto,
} from '../../domain/models';
import { MySqlService } from '../../database/mysql.service';
import type { ICategoryRepository } from '../interfaces/category.repository.interface';

@Injectable()
export class MySqlCategoryRepository implements ICategoryRepository {
  constructor(private readonly mysql: MySqlService) {}

  private mapRow(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      status: row.status || 'active',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async findById(id: string): Promise<Category | null> {
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      'SELECT * FROM categories WHERE id = ? LIMIT 1',
      [id],
    )) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      'SELECT * FROM categories WHERE slug = ? LIMIT 1',
      [slug],
    )) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: CategoryQueryFilters): Promise<PaginatedResult<Category>> {
    await this.mysql.ensureSchema();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push('(name LIKE ? OR slug LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = (await this.mysql.pool.query(
      `SELECT COUNT(*) as total FROM categories ${whereClause}`,
      params,
    )) as any;
    const total = countRows[0]?.total || 0;

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const [rows] = (await this.mysql.pool.query(
      `SELECT * FROM categories ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,
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

  async create(data: CreateCategoryDto): Promise<Category> {
    await this.mysql.ensureSchema();
    const id = randomUUID();
    await this.mysql.pool.query(
      'INSERT INTO categories (id, name, slug, description, status) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, data.slug, data.description || null, data.status || 'active'],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    await this.mysql.ensureSchema();
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.slug !== undefined) {
      updates.push('slug = ?');
      params.push(data.slug);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (updates.length > 0) {
      await this.mysql.pool.query(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
        [...params, id],
      );
    }

    return (await this.findById(id))!;
  }

  async softDelete(id: string): Promise<boolean> {
    await this.mysql.ensureSchema();
    const [res] = (await this.mysql.pool.query(
      "UPDATE categories SET status = 'archived' WHERE id = ?",
      [id],
    )) as any;
    return res?.affectedRows > 0;
  }
}
