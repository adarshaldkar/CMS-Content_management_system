import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CreateUserDto,
  PaginatedResult,
  UpdateUserDto,
  User,
  UserQueryFilters,
} from '../../domain/models';
import { UserRole } from '../../domain/models';
import { MySqlService } from '../../database/mysql.service';
import type { IUserRepository } from '../interfaces/user.repository.interface';

@Injectable()
export class MySqlUserRepository implements IUserRepository {
  constructor(private readonly mysql: MySqlService) {}

  private mapRowToUser(row: any): User {
    let preferredTopics: string[] = [];
    try {
      if (typeof row.preferred_topics === 'string') preferredTopics = JSON.parse(row.preferred_topics);
      else if (Array.isArray(row.preferred_topics)) preferredTopics = row.preferred_topics;
    } catch {
      preferredTopics = [];
    }

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      bio: row.bio || undefined,
      avatarUrl: row.avatar_url || undefined,
      preferredTopics,
      role: (row.role as UserRole) || UserRole.AUTHOR,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    };
  }

  async findById(id: string): Promise<User | null> {
    await this.mysql.ensureSchema();
    const [rows] = await this.mysql.pool.query(
      'SELECT * FROM cms_users WHERE id = ? LIMIT 1',
      [id],
    ) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRowToUser(rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.mysql.ensureSchema();
    const [rows] = await this.mysql.pool.query(
      'SELECT * FROM cms_users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email],
    ) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRowToUser(rows[0]);
  }

  async findMany(filters: UserQueryFilters): Promise<PaginatedResult<User>> {
    await this.mysql.ensureSchema();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.role) {
      conditions.push('role = ?');
      params.push(filters.role);
    }
    if (filters.isActive !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.isActive ? 1 : 0);
    }
    if (filters.search) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await this.mysql.pool.query(
      `SELECT COUNT(*) as total FROM cms_users ${whereClause}`,
      params,
    ) as any;
    const total = countRows[0]?.total || 0;

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    const [rows] = await this.mysql.pool.query(
      `SELECT * FROM cms_users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ) as any;

    return {
      items: (rows || []).map((r: any) => this.mapRowToUser(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: CreateUserDto): Promise<User> {
    await this.mysql.ensureSchema();
    const id = randomUUID();
    const userRole = data.role || UserRole.AUTHOR;
    const isActive = data.isActive !== undefined ? data.isActive : true;

    await this.mysql.pool.query(
      `INSERT INTO cms_users (id, email, name, password_hash, role, is_active, avatar_url, bio, preferred_topics)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.email,
        data.name,
        data.passwordHash,
        userRole,
        isActive ? 1 : 0,
        data.avatarUrl || null,
        data.bio || null,
        JSON.stringify(data.preferredTopics || []),
      ],
    );

    return (await this.findById(id))!;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    await this.mysql.ensureSchema();
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.bio !== undefined) {
      updates.push('bio = ?');
      params.push(data.bio);
    }
    if (data.avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      params.push(data.avatarUrl);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.preferredTopics !== undefined) {
      updates.push('preferred_topics = ?');
      params.push(JSON.stringify(data.preferredTopics));
    }

    if (updates.length > 0) {
      await this.mysql.pool.query(
        `UPDATE cms_users SET ${updates.join(', ')} WHERE id = ?`,
        [...params, id],
      );
    }

    return (await this.findById(id))!;
  }

  async softDelete(id: string): Promise<boolean> {
    await this.mysql.ensureSchema();
    const [res] = await this.mysql.pool.query(
      'UPDATE cms_users SET is_active = 0 WHERE id = ?',
      [id],
    ) as any;
    return res?.affectedRows > 0;
  }

  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.mysql.ensureSchema();
    await this.mysql.pool.query(
      'UPDATE cms_users SET password_reset_token = ?, password_reset_expires_at = ?, updated_at = NOW() WHERE id = ?',
      [tokenHash, expiresAt, userId],
    );
  }

  async findByPasswordResetToken(tokenHash: string): Promise<import('../../domain/models').User | null> {
    await this.mysql.ensureSchema();
    const [rows] = await this.mysql.pool.query(
      'SELECT * FROM cms_users WHERE password_reset_token = ? AND password_reset_expires_at > NOW() AND deleted_at IS NULL LIMIT 1',
      [tokenHash],
    ) as any;
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row ? this.mapRowToUser(row) : null;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.mysql.ensureSchema();
    await this.mysql.pool.query(
      'UPDATE cms_users SET password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = NOW() WHERE id = ?',
      [userId],
    );
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.mysql.ensureSchema();
    await this.mysql.pool.query(
      'UPDATE cms_users SET password_hash = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [newPasswordHash, userId],
    );
  }
}
