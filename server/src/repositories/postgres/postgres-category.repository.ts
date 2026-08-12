import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type {
  Category,
  CategoryQueryFilters,
  CreateCategoryDto,
  PaginatedResult,
  UpdateCategoryDto,
} from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { ICategoryRepository } from '../interfaces/category.repository.interface';

interface CategoryRow extends QueryResultRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

interface CountRow extends QueryResultRow {
  total: number;
}

@Injectable()
export class PostgresCategoryRepository implements ICategoryRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS categories (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          slug text NOT NULL UNIQUE,
          description text,
          status text NOT NULL DEFAULT 'active',
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
      `,
      )
      .then(() => undefined);

    await this.ready;
  }

  private toDomain(row: CategoryRow): Category {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string, includeInactive = false): Promise<Category | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<CategoryRow>(
      includeInactive
        ? 'SELECT * FROM categories WHERE id = $1'
        : "SELECT * FROM categories WHERE id = $1 AND status = 'active'",
      [id],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findBySlug(slug: string, includeInactive = false): Promise<Category | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<CategoryRow>(
      includeInactive
        ? 'SELECT * FROM categories WHERE slug = $1'
        : "SELECT * FROM categories WHERE slug = $1 AND status = 'active'",
      [slug],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findMany(
    filters: CategoryQueryFilters,
  ): Promise<PaginatedResult<Category>> {
    await this.ensureSchema();
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;
    const values: unknown[] = [];
    const clauses: string[] = [];

    if (filters.status !== undefined) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    } else {
      clauses.push("status = 'active'");
    }
    if (filters.search) {
      values.push(`%${filters.search}%`);
      clauses.push(
        `(name ILIKE $${values.length} OR slug ILIKE $${values.length})`,
      );
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await this.postgres.pool.query<CountRow>(
      `SELECT count(*)::int AS total FROM categories ${where}`,
      values,
    );

    values.push(limit, offset);
    const dataResult = await this.postgres.pool.query<CategoryRow>(
      `SELECT * FROM categories ${where} ORDER BY name ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    const total = countResult.rows[0]?.total ?? 0;
    return {
      items: dataResult.rows.map((row) => this.toDomain(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: CreateCategoryDto): Promise<Category> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<CategoryRow>(
      `INSERT INTO categories (name, slug, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.slug, data.description ?? null, data.status ?? 'active'],
    );
    return this.toDomain(result.rows[0]);
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    await this.ensureSchema();
    const updates: string[] = [];
    const values: unknown[] = [];
    const columnByField: Partial<Record<keyof UpdateCategoryDto, string>> = {
      name: 'name',
      slug: 'slug',
      description: 'description',
      status: 'status',
    };

    for (const [field, column] of Object.entries(columnByField) as Array<
      [keyof UpdateCategoryDto, string]
    >) {
      if (data[field] !== undefined) {
        values.push(data[field]);
        updates.push(`${column} = $${values.length}`);
      }
    }

    updates.push('updated_at = now()');
    values.push(id);

    const result = await this.postgres.pool.query<CategoryRow>(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!result.rows[0]) throw new Error('Category not found');
    return this.toDomain(result.rows[0]);
  }

  async softDelete(id: string): Promise<boolean> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query(
      `UPDATE categories
       SET status = 'inactive', updated_at = now()
       WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
