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
import { CockroachDbService } from '../../database/cockroach.service';
import type { IUserRepository } from '../interfaces/user.repository.interface';

@Injectable()
export class CockroachUserRepository implements IUserRepository {
  constructor(private readonly cockroach: CockroachDbService) {}

  private mapRowToUser(row: any): User {
    let preferredTopics: string[] = [];
    try {
      if (typeof row.preferred_topics === 'string') preferredTopics = JSON.parse(row.preferred_topics);
      else if (Array.isArray(row.preferred_topics)) preferredTopics = row.preferred_topics;
    } catch {
      preferredTopics = [];
    }

    let notificationPreferences: any = undefined;
    try {
      if (typeof row.notification_preferences === 'string') {
        notificationPreferences = JSON.parse(row.notification_preferences);
      } else if (row.notification_preferences) {
        notificationPreferences = row.notification_preferences;
      }
    } catch {
      notificationPreferences = undefined;
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
      isEmailVerified: Boolean(row.is_email_verified),
      emailVerificationToken: row.email_verification_token || undefined,
      emailVerificationExpiresAt: row.email_verification_expires_at ? new Date(row.email_verification_expires_at) : null,
      acceptedTermsVersion: row.accepted_terms_version || undefined,
      acceptedTermsAt: row.accepted_terms_at ? new Date(row.accepted_terms_at) : null,
      notificationPreferences,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    };
  }

  async findById(id: string): Promise<User | null> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM cms_users WHERE id = $1 LIMIT 1',
      [id],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRowToUser(rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM cms_users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRowToUser(rows[0]);
  }

  async findMany(filters: UserQueryFilters): Promise<PaginatedResult<User>> {
    await this.cockroach.ensureSchema();
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.role) {
      conditions.push(`role = $${idx++}`);
      params.push(filters.role);
    }
    if (filters.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      params.push(filters.isActive);
    }
    if (filters.search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows: countRows } = await this.cockroach.pool.query(
      `SELECT COUNT(*) as total FROM cms_users ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0]?.total || '0', 10);

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    const { rows } = await this.cockroach.pool.query(
      `SELECT * FROM cms_users ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return {
      items: rows.map((r) => this.mapRowToUser(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(data: CreateUserDto): Promise<User> {
    await this.cockroach.ensureSchema();
    const id = data.id || randomUUID();
    const userRole = data.role || UserRole.AUTHOR;
    const isActive = data.isActive !== undefined ? data.isActive : true;

    await this.cockroach.pool.query(
      `INSERT INTO cms_users (id, email, name, password_hash, role, is_active, avatar_url, bio, preferred_topics, is_email_verified, email_verification_token, email_verification_expires_at, accepted_terms_version, accepted_terms_at, notification_preferences)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         is_active = EXCLUDED.is_active,
         updated_at = now();`,
      [
        id,
        data.email,
        data.name,
        data.passwordHash,
        userRole,
        isActive,
        data.avatarUrl || null,
        data.bio || null,
        JSON.stringify(data.preferredTopics || []),
        data.isEmailVerified ?? false,
        data.emailVerificationToken || null,
        data.emailVerificationExpiresAt || null,
        data.acceptedTermsVersion || null,
        data.acceptedTermsAt || null,
        data.notificationPreferences ? JSON.stringify(data.notificationPreferences) : null,
      ],
    );

    return (await this.findByEmail(data.email))!;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    await this.cockroach.ensureSchema();
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.bio !== undefined) {
      updates.push(`bio = $${idx++}`);
      params.push(data.bio);
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      params.push(data.avatarUrl);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${idx++}`);
      params.push(data.role);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(data.isActive);
    }
    if (data.preferredTopics !== undefined) {
      updates.push(`preferred_topics = $${idx++}`);
      params.push(JSON.stringify(data.preferredTopics));
    }
    if (data.isEmailVerified !== undefined) {
      updates.push(`is_email_verified = $${idx++}`);
      params.push(data.isEmailVerified);
    }
    if (data.emailVerificationToken !== undefined) {
      updates.push(`email_verification_token = $${idx++}`);
      params.push(data.emailVerificationToken);
    }
    if (data.emailVerificationExpiresAt !== undefined) {
      updates.push(`email_verification_expires_at = $${idx++}`);
      params.push(data.emailVerificationExpiresAt);
    }
    if (data.acceptedTermsVersion !== undefined) {
      updates.push(`accepted_terms_version = $${idx++}`);
      params.push(data.acceptedTermsVersion);
    }
    if (data.acceptedTermsAt !== undefined) {
      updates.push(`accepted_terms_at = $${idx++}`);
      params.push(data.acceptedTermsAt);
    }
    if (data.notificationPreferences !== undefined) {
      updates.push(`notification_preferences = $${idx++}`);
      params.push(JSON.stringify(data.notificationPreferences));
    }
    if (data.passwordHash !== undefined) {
      updates.push(`password_hash = $${idx++}`);
      params.push(data.passwordHash);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = now()`);
      params.push(id);
      await this.cockroach.pool.query(
        `UPDATE cms_users SET ${updates.join(', ')} WHERE id = $${idx}`,
        params,
      );
    }

    return (await this.findById(id))!;
  }

  async softDelete(id: string): Promise<boolean> {
    await this.cockroach.ensureSchema();
    const { rowCount } = await this.cockroach.pool.query(
      'UPDATE cms_users SET is_active = false, deleted_at = now() WHERE id = $1',
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.cockroach.ensureSchema();
    await this.cockroach.pool.query(
      `UPDATE cms_users SET password_reset_token = $1, password_reset_expires_at = $2, updated_at = now()
       WHERE id = $3 AND deleted_at IS NULL`,
      [tokenHash, expiresAt, userId],
    );
  }

  async findByPasswordResetToken(tokenHash: string): Promise<import('../../domain/models').User | null> {
    await this.cockroach.ensureSchema();
    const result = await this.cockroach.pool.query(
      `SELECT * FROM cms_users
       WHERE password_reset_token = $1
         AND password_reset_expires_at > now()
         AND deleted_at IS NULL
       LIMIT 1`,
      [tokenHash],
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findByEmailVerificationToken(tokenHash: string): Promise<import('../../domain/models').User | null> {
    await this.cockroach.ensureSchema();
    const result = await this.cockroach.pool.query(
      `SELECT * FROM cms_users
       WHERE email_verification_token = $1
         AND email_verification_expires_at > now()
         AND deleted_at IS NULL
       LIMIT 1`,
      [tokenHash],
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.cockroach.ensureSchema();
    await this.cockroach.pool.query(
      'UPDATE cms_users SET password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = now() WHERE id = $1',
      [userId],
    );
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.cockroach.ensureSchema();
    await this.cockroach.pool.query(
      'UPDATE cms_users SET password_hash = $1, updated_at = now() WHERE id = $2 AND deleted_at IS NULL',
      [newPasswordHash, userId],
    );
  }
}
