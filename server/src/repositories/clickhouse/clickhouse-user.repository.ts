import { Injectable } from '@nestjs/common';
import type {
  CreateUserDto,
  PaginatedResult,
  UpdateUserDto,
  User,
  UserQueryFilters,
} from '../../domain/models';
import { UserRole } from '../../domain/models';
import { ClickHouseService } from '../../database/clickhouse.service';
import type { IUserRepository } from '../interfaces/user.repository.interface';

@Injectable()
export class ClickHouseUserRepository implements IUserRepository {
  constructor(private readonly clickhouse: ClickHouseService) {}

  private mapRow(r: any): User {
    return {
      id: r.id,
      email: r.email,
      name: r.name,
      passwordHash: '',
      bio: r.bio || undefined,
      avatarUrl: r.avatar_url || undefined,
      preferredTopics: Array.isArray(r.preferred_topics) ? r.preferred_topics : [],
      role: (r.role as UserRole) || UserRole.AUTHOR,
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at || Date.now()),
      updatedAt: new Date(r.updated_at || Date.now()),
      deletedAt: null,
    };
  }

  async findById(id: string): Promise<User | null> {
    await this.clickhouse.ensureSchema();
    const res = await this.clickhouse.client.query({
      query: 'SELECT * FROM cms_platform.user_snapshots WHERE id = {id:String} LIMIT 1',
      query_params: { id },
      format: 'JSONEachRow',
    });
    const rows = await res.json<any>();
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.clickhouse.ensureSchema();
    const res = await this.clickhouse.client.query({
      query: 'SELECT * FROM cms_platform.user_snapshots WHERE email = {email:String} LIMIT 1',
      query_params: { email },
      format: 'JSONEachRow',
    });
    const rows = await res.json<any>();
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: UserQueryFilters): Promise<PaginatedResult<User>> {
    await this.clickhouse.ensureSchema();
    const res = await this.clickhouse.client.query({
      query: 'SELECT * FROM cms_platform.user_snapshots ORDER BY created_at DESC LIMIT {limit:UInt32}',
      query_params: { limit: filters.limit || 20 },
      format: 'JSONEachRow',
    });
    const rows = await res.json<any>();
    const items = rows.map((r: any) => this.mapRow(r));
    return {
      items,
      total: items.length,
      page: filters.page || 1,
      limit: filters.limit || 20,
      totalPages: 1,
    };
  }

  async create(data: CreateUserDto): Promise<User> {
    await this.clickhouse.ensureSchema();
    const id = (data as any).id || String(Date.now());
    await this.clickhouse.client.insert({
      table: 'cms_platform.user_snapshots',
      values: [
        {
          id,
          email: data.email,
          name: data.name,
          role: data.role || 'AUTHOR',
          is_active: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
          avatar_url: data.avatarUrl || '',
          bio: data.bio || '',
          preferred_topics: data.preferredTopics || [],
        },
      ],
      format: 'JSONEachRow',
    });
    return (await this.findById(id))!;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    await this.clickhouse.ensureSchema();
    const existing = await this.findById(id);
    if (!existing) throw new Error('User not found in ClickHouse snapshot');
    await this.clickhouse.client.insert({
      table: 'cms_platform.user_snapshots',
      values: [
        {
          id,
          email: existing.email,
          name: data.name !== undefined ? data.name : existing.name,
          role: data.role !== undefined ? data.role : existing.role,
          is_active: data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.isActive ? 1 : 0,
          avatar_url: data.avatarUrl !== undefined ? data.avatarUrl : existing.avatarUrl || '',
          bio: data.bio !== undefined ? data.bio : existing.bio || '',
          preferred_topics: data.preferredTopics !== undefined ? data.preferredTopics : existing.preferredTopics || [],
        },
      ],
      format: 'JSONEachRow',
    });
    return (await this.findById(id))!;
  }

  async softDelete(_id: string): Promise<boolean> {
    return true;
  }

  // ClickHouse is an analytics store — password reset operations are not supported.
  // These are stub implementations that satisfy the interface; the active primary repo
  // (Postgres or CockroachDB) handles actual password reset logic.
  async setPasswordResetToken(_userId: string, _tokenHash: string, _expiresAt: Date): Promise<void> {
    // No-op: ClickHouse is OLAP-only; auth state is managed in the transactional primary
  }

  async findByPasswordResetToken(_tokenHash: string): Promise<import('../../domain/models').User | null> {
    return null; // ClickHouse does not store password reset tokens
  }

  async findByEmailVerificationToken(_tokenHash: string): Promise<import('../../domain/models').User | null> {
    return null; // ClickHouse does not store email verification tokens
  }

  async clearPasswordResetToken(_userId: string): Promise<void> {
    // No-op: ClickHouse is OLAP-only
  }

  async updatePassword(_userId: string, _newPasswordHash: string): Promise<void> {
    // No-op: ClickHouse is OLAP-only
  }
}
