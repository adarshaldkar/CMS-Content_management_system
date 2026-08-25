import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Follow,
  CreateFollowDto,
  FollowQueryFilters,
  PaginatedResult,
} from '../../domain/models';
import { FollowTargetType } from '../../domain/models';
import { MariaDbService } from '../../database/mariadb.service';
import type { IFollowRepository } from '../interfaces/follow.repository.interface';

@Injectable()
export class MariaDbFollowRepository implements IFollowRepository {
  constructor(private readonly mariadb: MariaDbService) {}

  private mapRow(row: any): Follow {
    return {
      id: row.id,
      followerId: row.follower_id,
      targetType: row.target_type === 'category' ? FollowTargetType.CATEGORY : FollowTargetType.USER,
      targetId: row.target_id || row.following_id || row.category_slug,
      createdAt: new Date(row.created_at),
    };
  }

  async findOne(
    followerId: string,
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<Follow | null> {
    await this.mariadb.ensureSchema();
    const [rows] = (await this.mariadb.pool.query(
      'SELECT * FROM follows WHERE follower_id = ? AND (target_id = ? OR following_id = ? OR category_slug = ?) LIMIT 1',
      [followerId, targetId, targetId, targetId],
    )) as any;
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: FollowQueryFilters): Promise<PaginatedResult<Follow>> {
    await this.mariadb.ensureSchema();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.followerId) {
      conditions.push('follower_id = ?');
      params.push(filters.followerId);
    }
    if (filters.targetType) {
      conditions.push('(target_type = ? OR (following_id IS NOT NULL AND ? = "user") OR (category_slug IS NOT NULL AND ? = "category"))');
      params.push(filters.targetType, filters.targetType, filters.targetType);
    }
    if (filters.targetId) {
      conditions.push('(target_id = ? OR following_id = ? OR category_slug = ?)');
      params.push(filters.targetId, filters.targetId, filters.targetId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = (await this.mariadb.pool.query(
      `SELECT COUNT(*) as total FROM follows ${whereClause}`,
      params,
    )) as any;
    const total = countRows[0]?.total || 0;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const [rows] = (await this.mariadb.pool.query(
      `SELECT * FROM follows ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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

  async create(dto: CreateFollowDto): Promise<Follow> {
    await this.mariadb.ensureSchema();
    const id = randomUUID();
    const followingId = dto.targetType === FollowTargetType.USER ? dto.targetId : null;
    const categorySlug = dto.targetType === FollowTargetType.CATEGORY ? dto.targetId : null;

    await this.mariadb.pool.query(
      'INSERT INTO follows (id, follower_id, following_id, category_slug) VALUES (?, ?, ?, ?)',
      [id, dto.followerId, followingId, categorySlug],
    );
    return (await this.findOne(dto.followerId, dto.targetType, dto.targetId))!;
  }

  async delete(
    followerId: string,
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<boolean> {
    await this.mariadb.ensureSchema();
    const query =
      targetType === FollowTargetType.USER
        ? 'DELETE FROM follows WHERE follower_id = ? AND (following_id = ? OR target_id = ?)'
        : 'DELETE FROM follows WHERE follower_id = ? AND (category_slug = ? OR target_id = ?)';

    const [res] = (await this.mariadb.pool.query(query, [followerId, targetId, targetId])) as any;
    return res?.affectedRows > 0;
  }

  async countFollowers(targetType: FollowTargetType, targetId: string): Promise<number> {
    await this.mariadb.ensureSchema();
    const query =
      targetType === FollowTargetType.USER
        ? 'SELECT COUNT(*) as total FROM follows WHERE (following_id = ? OR target_id = ?)'
        : 'SELECT COUNT(*) as total FROM follows WHERE (category_slug = ? OR target_id = ?)';

    const [rows] = (await this.mariadb.pool.query(query, [targetId, targetId])) as any;
    return rows[0]?.total || 0;
  }

  async countFollowing(followerId: string, targetType: FollowTargetType): Promise<number> {
    await this.mariadb.ensureSchema();
    const query =
      targetType === FollowTargetType.USER
        ? 'SELECT COUNT(*) as total FROM follows WHERE follower_id = ? AND (following_id IS NOT NULL OR target_type = "user")'
        : 'SELECT COUNT(*) as total FROM follows WHERE follower_id = ? AND (category_slug IS NOT NULL OR target_type = "category")';

    const [rows] = (await this.mariadb.pool.query(query, [followerId])) as any;
    return rows[0]?.total || 0;
  }
}
