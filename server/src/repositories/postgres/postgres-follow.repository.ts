import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { Follow, CreateFollowDto, FollowQueryFilters, PaginatedResult } from '../../domain/models';
import { FollowTargetType } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { IFollowRepository } from '../interfaces/follow.repository.interface';

interface FollowRow extends QueryResultRow {
  id: string;
  follower_id: string;
  target_type: string;
  target_id: string;
  created_at: Date;
}

@Injectable()
export class PostgresFollowRepository implements IFollowRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE TABLE IF NOT EXISTS follows (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          follower_id text NOT NULL,
          target_type text NOT NULL CHECK (target_type IN ('user', 'category')),
          target_id text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(follower_id, target_type, target_id)
        );
        CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
        CREATE INDEX IF NOT EXISTS idx_follows_target ON follows(target_type, target_id);
        `,
      )
      .then(() => undefined);
    return this.ready;
  }

  private toDomain(row: FollowRow): Follow {
    return {
      id: row.id,
      followerId: row.follower_id,
      targetType: row.target_type as FollowTargetType,
      targetId: row.target_id,
      createdAt: row.created_at,
    };
  }

  async findOne(followerId: string, targetType: FollowTargetType, targetId: string): Promise<Follow | null> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<FollowRow>(
      `SELECT * FROM follows WHERE follower_id = $1 AND target_type = $2 AND target_id = $3`,
      [followerId, targetType, targetId],
    );
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findMany(filters: FollowQueryFilters): Promise<PaginatedResult<Follow>> {
    await this.ensureSchema();
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (filters.followerId) { conditions.push(`follower_id = $${i++}`); params.push(filters.followerId); }
    if (filters.targetType) { conditions.push(`target_type = $${i++}`); params.push(filters.targetType); }
    if (filters.targetId) { conditions.push(`target_id = $${i++}`); params.push(filters.targetId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      this.postgres.pool.query<FollowRow>(
        `SELECT * FROM follows ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`,
        [...params, limit, offset],
      ),
      this.postgres.pool.query<{ total: string }>(
        `SELECT COUNT(*) as total FROM follows ${where}`,
        params,
      ),
    ]);

    const total = parseInt(countRows[0]?.total ?? '0', 10);
    return {
      items: rows.map((r) => this.toDomain(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async create(dto: CreateFollowDto): Promise<Follow> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<FollowRow>(
      `INSERT INTO follows (follower_id, target_type, target_id) VALUES ($1, $2, $3)
       ON CONFLICT (follower_id, target_type, target_id) DO UPDATE SET follower_id = EXCLUDED.follower_id
       RETURNING *`,
      [dto.followerId, dto.targetType, dto.targetId],
    );
    return this.toDomain(rows[0]);
  }

  async delete(followerId: string, targetType: FollowTargetType, targetId: string): Promise<boolean> {
    await this.ensureSchema();
    const { rowCount } = await this.postgres.pool.query(
      `DELETE FROM follows WHERE follower_id = $1 AND target_type = $2 AND target_id = $3`,
      [followerId, targetType, targetId],
    );
    return (rowCount ?? 0) > 0;
  }

  async countFollowers(targetType: FollowTargetType, targetId: string): Promise<number> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM follows WHERE target_type = $1 AND target_id = $2`,
      [targetType, targetId],
    );
    return parseInt(rows[0]?.total ?? '0', 10);
  }

  async countFollowing(followerId: string, targetType: FollowTargetType): Promise<number> {
    await this.ensureSchema();
    const { rows } = await this.postgres.pool.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM follows WHERE follower_id = $1 AND target_type = $2`,
      [followerId, targetType],
    );
    return parseInt(rows[0]?.total ?? '0', 10);
  }
}
