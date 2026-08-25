import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Category,
  CategoryQueryFilters,
  CreateCategoryDto,
  PaginatedResult,
  UpdateCategoryDto,
} from '../../domain/models';
import { CockroachDbService } from '../../database/cockroach.service';
import type { ICategoryRepository } from '../interfaces/category.repository.interface';

@Injectable()
export class CockroachCategoryRepository implements ICategoryRepository {
  constructor(private readonly cockroach: CockroachDbService) {}

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
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM categories WHERE id = $1 LIMIT 1',
      [id],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM categories WHERE slug = $1 LIMIT 1',
      [slug],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: CategoryQueryFilters): Promise<PaginatedResult<Category>> {
    await this.cockroach.ensureSchema();
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push(`(name ILIKE $${idx} OR slug ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows: countRows } = await this.cockroach.pool.query(
      `SELECT COUNT(*) as total FROM categories ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0]?.total || '0', 10);

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const { rows } = await this.cockroach.pool.query(
      `SELECT * FROM categories ${whereClause} ORDER BY name ASC LIMIT $${idx++} OFFSET $${idx++}`,
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

  async create(data: CreateCategoryDto): Promise<Category> {
    await this.cockroach.ensureSchema();
    const id = randomUUID();
    await this.cockroach.pool.query(
      'INSERT INTO categories (id, name, slug, description, status) VALUES ($1, $2, $3, $4, $5)',
      [id, data.name, data.slug, data.description || null, data.status || 'active'],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    await this.cockroach.ensureSchema();
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${idx++}`);
      params.push(data.slug);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(data.status);
    }

    if (updates.length > 0) {
      updates.push('updated_at = now()');
      params.push(id);
      await this.cockroach.pool.query(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = $${idx}`,
        params,
      );
    }

    return (await this.findById(id))!;
  }

  async softDelete(id: string): Promise<boolean> {
    await this.cockroach.ensureSchema();
    const { rowCount } = await this.cockroach.pool.query(
      "UPDATE categories SET status = 'archived' WHERE id = $1",
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
