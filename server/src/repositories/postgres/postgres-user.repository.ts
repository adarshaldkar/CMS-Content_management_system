import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type {
  CreateUserDto,
  PaginatedResult,
  UpdateUserDto,
  User,
  UserQueryFilters,
} from '../../domain/models';
import { UserRole } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { IUserRepository } from '../interfaces/user.repository.interface';

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  bio: string | null;
  avatar_url: string | null;
  preferred_topics: string[] | null;
  role: string;
  is_active: boolean;
  password_reset_token: string | null;
  password_reset_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface CountRow extends QueryResultRow {
  total: number;
}

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS cms_users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL UNIQUE,
          name text NOT NULL,
          password_hash text NOT NULL,
          bio text,
          avatar_url text,
          preferred_topics text[] DEFAULT '{}',
          role text NOT NULL DEFAULT 'USER',
          is_active boolean NOT NULL DEFAULT true,
          password_reset_token text,
          password_reset_expires_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        );

        ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS preferred_topics text[] DEFAULT '{}';
        ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS password_reset_token text;
        ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamptz;

        CREATE INDEX IF NOT EXISTS idx_cms_users_role ON cms_users(role);
        CREATE INDEX IF NOT EXISTS idx_cms_users_is_active ON cms_users(is_active);
        CREATE INDEX IF NOT EXISTS idx_cms_users_created_at ON cms_users(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_cms_users_reset_token ON cms_users(password_reset_token) WHERE password_reset_token IS NOT NULL;
      `,
      )
      .then(() => undefined);

    await this.ready;
  }

  private toDomain(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      preferredTopics: row.preferred_topics || [],
      role: row.role as UserRole,
      isActive: row.is_active,
      passwordResetToken: row.password_reset_token,
      passwordResetExpiresAt: row.password_reset_expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<UserRow>(
      'SELECT * FROM cms_users WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<UserRow>(
      'SELECT * FROM cms_users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findMany(filters: UserQueryFilters): Promise<PaginatedResult<User>> {
    await this.ensureSchema();
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;
    const values: unknown[] = [];
    const clauses = ['deleted_at IS NULL'];

    if (filters.role) {
      values.push(filters.role);
      clauses.push(`role = $${values.length}`);
    }
    if (filters.isActive !== undefined) {
      values.push(filters.isActive);
      clauses.push(`is_active = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search}%`);
      clauses.push(
        `(email ILIKE $${values.length} OR name ILIKE $${values.length})`,
      );
    }

    const where = `WHERE ${clauses.join(' AND ')}`;
    const countResult = await this.postgres.pool.query<CountRow>(
      `SELECT count(*)::int AS total FROM cms_users ${where}`,
      values,
    );

    values.push(limit, offset);
    const dataResult = await this.postgres.pool.query<UserRow>(
      `SELECT * FROM cms_users ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
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

  async create(data: CreateUserDto): Promise<User> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<UserRow>(
      `INSERT INTO cms_users (email, name, password_hash, bio, avatar_url, preferred_topics, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.email.toLowerCase(),
        data.name,
        data.passwordHash,
        data.bio ?? null,
        data.avatarUrl ?? null,
        data.preferredTopics ?? [],
        data.role ?? UserRole.USER,
        data.isActive ?? true,
      ],
    );
    return this.toDomain(result.rows[0]);
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    await this.ensureSchema();
    const updates: string[] = [];
    const values: unknown[] = [];
    const columnByField: Partial<Record<keyof UpdateUserDto, string>> = {
      email: 'email',
      name: 'name',
      passwordHash: 'password_hash',
      bio: 'bio',
      avatarUrl: 'avatar_url',
      preferredTopics: 'preferred_topics',
      role: 'role',
      isActive: 'is_active',
    };

    for (const [field, column] of Object.entries(columnByField) as Array<
      [keyof UpdateUserDto, string]
    >) {
      if (data[field] !== undefined) {
        const value =
          field === 'email' && data.email
            ? data.email.toLowerCase()
            : data[field];
        values.push(value);
        updates.push(`${column} = $${values.length}`);
      }
    }

    updates.push('updated_at = now()');
    values.push(id);

    const result = await this.postgres.pool.query<UserRow>(
      `UPDATE cms_users SET ${updates.join(', ')} WHERE id = $${values.length} AND deleted_at IS NULL RETURNING *`,
      values,
    );
    if (!result.rows[0]) throw new Error('User not found');
    return this.toDomain(result.rows[0]);
  }

  async softDelete(id: string): Promise<boolean> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query(
      `UPDATE cms_users
       SET deleted_at = now(), updated_at = now(), is_active = false
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.ensureSchema();
    await this.postgres.pool.query(
      `UPDATE cms_users
       SET password_reset_token = $1, password_reset_expires_at = $2, updated_at = now()
       WHERE id = $3 AND deleted_at IS NULL`,
      [tokenHash, expiresAt, userId],
    );
  }

  async findByPasswordResetToken(tokenHash: string): Promise<User | null> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<UserRow>(
      `SELECT * FROM cms_users
       WHERE password_reset_token = $1
         AND password_reset_expires_at > now()
         AND deleted_at IS NULL`,
      [tokenHash],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.ensureSchema();
    await this.postgres.pool.query(
      `UPDATE cms_users
       SET password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = now()
       WHERE id = $1`,
      [userId],
    );
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.ensureSchema();
    await this.postgres.pool.query(
      `UPDATE cms_users
       SET password_hash = $1, updated_at = now()
       WHERE id = $2 AND deleted_at IS NULL`,
      [newPasswordHash, userId],
    );
  }
}
