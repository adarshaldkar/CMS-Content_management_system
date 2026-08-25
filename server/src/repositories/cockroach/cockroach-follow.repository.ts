import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  Follow,
  CreateFollowDto,
  FollowQueryFilters,
  PaginatedResult,
} from '../../domain/models';
import { FollowTargetType } from '../../domain/models';
import { CockroachDbService } from '../../database/cockroach.service';
import type { IFollowRepository } from '../interfaces/follow.repository.interface';

@Injectable()
export class CockroachFollowRepository implements IFollowRepository {
  constructor(private readonly cockroach: CockroachDbService) {}

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
    await this.cockroach.ensureSchema();
    const { rows } = await this.cockroach.pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND (target_id = $2 OR following_id = $2 OR category_slug = $2) LIMIT 1',
      [followerId, targetId],
    );
    if (!rows || rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findMany(filters: FollowQueryFilters): Promise<PaginatedResult<Follow>> {
    await this.cockroach.ensureSchema();
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.followerId) {
      conditions.push(`follower_id = $${idx++}`);
      params.push(filters.followerId);
    }
    if (filters.targetType) {
      conditions.push(`(target_type = $${idx} OR (following_id IS NOT NULL AND $${idx} = 'user') OR (category_slug IS NOT NULL AND $${idx} = 'category'))`);
      params.push(filters.targetType);
      idx++;
    }
    if (filters.targetId) {
      conditions.push(`(target_id = $${idx} OR following_id = $${idx} OR category_slug = $${idx})`);
      params.push(filters.targetId);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows: countRows } = await this.cockroach.pool.query(
      `SELECT COUNT(*) as total FROM follows ${whereClause}`,
      params,
    );
    const total = parseInt(countRows[0]?.total || '0', 10);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const { rows } = await this.cockroach.pool.query(
      `SELECT * FROM follows ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
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

  async create(dto: CreateFollowDto): Promise<Follow> {
    await this.cockroach.ensureSchema();
    const id = randomUUID();
    const followingId = dto.targetType === FollowTargetType.USER ? dto.targetId : null;
    const categorySlug = dto.targetType === FollowTargetType.CATEGORY ? dto.targetId : null;

    await this.cockroach.pool.query(
      'INSERT INTO follows (id, follower_id, following_id, category_slug) VALUES ($1, $2, $3, $4)',
      [id, dto.followerId, followingId, categorySlug],
    );
    return (await this.findOne(dto.followerId, dto.targetType, dto.targetId))!;
  }

  async delete(
    followerId: string,
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<boolean> {
    await this.cockroach.ensureSchema();
    const query =
      targetType === FollowTargetType.USER
        ? 'DELETE FROM follows WHERE follower_id = $1 AND (following_id = $2 OR target_id = $2)'
        : 'DELETE FROM follows WHERE follower_id = $1 AND (category_slug = $2 OR target_id = $2)';

    const { rowCount } = await this.cockroach.pool.query(query, [followerId, targetId]);
    return (rowCount ?? 0) > 0;
  }

  async countFollowers(targetType: FollowTargetType, targetId: string): Promise<number> {
    await this.cockroach.ensureSchema();
    const query =
      targetType === FollowTargetType.USER
        ? 'SELECT COUNT(*) as total FROM follows WHERE (following_id = $1 OR target_id = $1)'
        : 'SELECT COUNT(*) as total FROM follows WHERE (category_slug = $1 OR target_id = $1)';

    const { rows } = await this.cockroach.pool.query(query, [targetId]);
    return parseInt(rows[0]?.total || '0', 10);
  }

  async countFollowing(followerId: string, targetType: FollowTargetType): Promise<number> {
    await this.cockroach.ensureSchema();
    const query =
      targetType === FollowTargetType.USER
        ? 'SELECT COUNT(*) as total FROM follows WHERE follower_id = $1 AND (following_id IS NOT NULL OR target_type = \'user\')'
        : 'SELECT COUNT(*) as total FROM follows WHERE follower_id = $1 AND (category_slug IS NOT NULL OR target_type = \'category\')';

    const { rows } = await this.cockroach.pool.query(query, [followerId]);
    return parseInt(rows[0]?.total || '0', 10);
  }
}
