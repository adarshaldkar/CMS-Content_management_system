import { Injectable, Logger } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import { PostgresService } from '../../database/postgres.service';
import type { IPublishingSlotRepository } from '../interfaces/publishing-slot.repository.interface';
import type {
  PublishingSlot,
  CreatePublishingSlotDto,
  UpdatePublishingSlotDto,
  AuthorSlotAssignment,
  AssignAuthorSlotDto,
  AuthorClearanceInfo,
} from '../../domain/models';

interface SlotRow extends QueryResultRow {
  id: string;
  name: string;
  slug: string;
  dispatch_time: string;
  timezone: string;
  days_active: string;
  max_articles_per_slot: number;
  stagger_minutes: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  queued_count?: string | number;
  assigned_author_count?: string | number;
}

interface AssignmentRow extends QueryResultRow {
  id: string;
  author_id: string;
  slot_id: string;
  auto_publish_enabled: boolean;
  daily_quota: number;
  assigned_by: string | null;
  created_at: Date;
  author_name?: string;
  author_email?: string;
  author_avatar?: string | null;
  slot_name?: string;
  slot_dispatch_time?: string;
}

@Injectable()
export class PostgresPublishingSlotRepository implements IPublishingSlotRepository {
  private readonly logger = new Logger(PostgresPublishingSlotRepository.name);
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = this.postgres.pool
        .query(
          `
        CREATE TABLE IF NOT EXISTS cms_publishing_slots (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          slug text NOT NULL UNIQUE,
          dispatch_time text NOT NULL,
          timezone text NOT NULL DEFAULT 'UTC',
          days_active text NOT NULL DEFAULT 'ALL',
          max_articles_per_slot int NOT NULL DEFAULT 5,
          stagger_minutes int NOT NULL DEFAULT 5,
          is_active boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS cms_author_slot_assignments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          author_id text NOT NULL UNIQUE,
          slot_id uuid NOT NULL REFERENCES cms_publishing_slots(id) ON DELETE CASCADE,
          auto_publish_enabled boolean NOT NULL DEFAULT true,
          daily_quota int NOT NULL DEFAULT 2,
          assigned_by text,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        -- Ensure columns on articles table
        ALTER TABLE articles ADD COLUMN IF NOT EXISTS publishing_slot_id text;
        ALTER TABLE articles ADD COLUMN IF NOT EXISTS auto_dispatched boolean NOT NULL DEFAULT false;

        -- Seed standard editorial default slots if table is empty
        INSERT INTO cms_publishing_slots (name, slug, dispatch_time, timezone, days_active, max_articles_per_slot, stagger_minutes)
        VALUES 
          ('Morning Global Intelligence Brief', 'morning-brief', '09:30:00', 'UTC', 'ALL', 5, 5),
          ('Afternoon Mid-Market Pulse', 'afternoon-pulse', '13:30:00', 'UTC', 'ALL', 5, 5),
          ('Prime Evening Editorial Digest', 'prime-evening', '16:30:00', 'UTC', 'ALL', 8, 5),
          ('Nightly Deep-Dive Edition', 'nightly-deep-dive', '20:30:00', 'UTC', 'ALL', 5, 5)
        ON CONFLICT (slug) DO NOTHING;
      `,
        )
        .then(() => undefined)
        .catch((err) => {
          this.logger.error('Failed to initialize publishing slot schema', err.stack);
          throw err;
        });
    }

    await this.ready;
  }

  private mapSlot(row: SlotRow): PublishingSlot {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      dispatchTime: row.dispatch_time,
      timezone: row.timezone || 'UTC',
      daysActive: row.days_active || 'ALL',
      maxArticlesPerSlot: Number(row.max_articles_per_slot ?? 5),
      staggerMinutes: Number(row.stagger_minutes ?? 5),
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      queuedCount: row.queued_count !== undefined ? Number(row.queued_count) : 0,
      assignedAuthorCount: row.assigned_author_count !== undefined ? Number(row.assigned_author_count) : 0,
    };
  }

  private mapAssignment(row: AssignmentRow): AuthorSlotAssignment {
    return {
      id: row.id,
      authorId: row.author_id,
      slotId: row.slot_id,
      autoPublishEnabled: Boolean(row.auto_publish_enabled),
      dailyQuota: Number(row.daily_quota ?? 2),
      assignedBy: row.assigned_by,
      createdAt: row.created_at,
      authorName: row.author_name,
      authorEmail: row.author_email,
      authorAvatar: row.author_avatar,
      slotName: row.slot_name,
      slotDispatchTime: row.slot_dispatch_time,
    };
  }

  async findAllSlots(): Promise<PublishingSlot[]> {
    await this.ensureSchema();
    const query = `
      SELECT 
        s.*,
        COALESCE((SELECT COUNT(*) FROM articles a WHERE a.publishing_slot_id = s.id::text AND a.status = 'scheduled'), 0) as queued_count,
        COALESCE((SELECT COUNT(*) FROM cms_author_slot_assignments m WHERE m.slot_id = s.id), 0) as assigned_author_count
      FROM cms_publishing_slots s
      ORDER BY s.dispatch_time ASC
    `;
    const res = await this.postgres.pool.query<SlotRow>(query);
    return res.rows.map((r: SlotRow) => this.mapSlot(r));
  }

  async findSlotById(id: string): Promise<PublishingSlot | null> {
    await this.ensureSchema();
    const query = `
      SELECT 
        s.*,
        COALESCE((SELECT COUNT(*) FROM articles a WHERE a.publishing_slot_id = s.id::text AND a.status = 'scheduled'), 0) as queued_count,
        COALESCE((SELECT COUNT(*) FROM cms_author_slot_assignments m WHERE m.slot_id = s.id), 0) as assigned_author_count
      FROM cms_publishing_slots s
      WHERE s.id::text = $1 OR s.slug = $1
      LIMIT 1
    `;
    const res = await this.postgres.pool.query<SlotRow>(query, [id]);
    return res.rows[0] ? this.mapSlot(res.rows[0]) : null;
  }

  async findSlotBySlug(slug: string): Promise<PublishingSlot | null> {
    await this.ensureSchema();
    const query = `SELECT * FROM cms_publishing_slots WHERE slug = $1 LIMIT 1`;
    const res = await this.postgres.pool.query<SlotRow>(query, [slug]);
    return res.rows[0] ? this.mapSlot(res.rows[0]) : null;
  }

  async createSlot(dto: CreatePublishingSlotDto): Promise<PublishingSlot> {
    await this.ensureSchema();
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const query = `
      INSERT INTO cms_publishing_slots (
        name, slug, dispatch_time, timezone, days_active, max_articles_per_slot, stagger_minutes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      dto.name,
      slug,
      dto.dispatchTime,
      dto.timezone || 'UTC',
      dto.daysActive || 'ALL',
      dto.maxArticlesPerSlot ?? 5,
      dto.staggerMinutes ?? 5,
      dto.isActive !== false,
    ];
    const res = await this.postgres.pool.query<SlotRow>(query, params);
    return this.mapSlot(res.rows[0]);
  }

  async updateSlot(id: string, dto: UpdatePublishingSlotDto): Promise<PublishingSlot | null> {
    await this.ensureSchema();
    const existing = await this.findSlotById(id);
    if (!existing) return null;

    const query = `
      UPDATE cms_publishing_slots
      SET
        name = COALESCE($1, name),
        dispatch_time = COALESCE($2, dispatch_time),
        timezone = COALESCE($3, timezone),
        days_active = COALESCE($4, days_active),
        max_articles_per_slot = COALESCE($5, max_articles_per_slot),
        stagger_minutes = COALESCE($6, stagger_minutes),
        is_active = COALESCE($7, is_active),
        updated_at = now()
      WHERE id::text = $8 OR slug = $8
      RETURNING *
    `;
    const params = [
      dto.name ?? null,
      dto.dispatchTime ?? null,
      dto.timezone ?? null,
      dto.daysActive ?? null,
      dto.maxArticlesPerSlot ?? null,
      dto.staggerMinutes ?? null,
      dto.isActive ?? null,
      id,
    ];
    const res = await this.postgres.pool.query<SlotRow>(query, params);
    return res.rows[0] ? this.mapSlot(res.rows[0]) : null;
  }

  async deleteSlot(id: string): Promise<boolean> {
    await this.ensureSchema();
    const query = `DELETE FROM cms_publishing_slots WHERE id::text = $1 OR slug = $1`;
    const res = await this.postgres.pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async findAllAssignments(): Promise<AuthorSlotAssignment[]> {
    await this.ensureSchema();
    const query = `
      SELECT 
        m.*,
        u.name as author_name,
        u.email as author_email,
        u.avatar_url as author_avatar,
        s.name as slot_name,
        s.dispatch_time as slot_dispatch_time
      FROM cms_author_slot_assignments m
      LEFT JOIN cms_users u ON u.id::text = m.author_id::text
      JOIN cms_publishing_slots s ON s.id = m.slot_id
      ORDER BY m.created_at DESC
    `;
    const res = await this.postgres.pool.query<AssignmentRow>(query);
    return res.rows.map((r: AssignmentRow) => this.mapAssignment(r));
  }

  async findAssignmentByAuthorId(authorId: string): Promise<AuthorSlotAssignment | null> {
    await this.ensureSchema();
    const query = `
      SELECT 
        m.*,
        u.name as author_name,
        u.email as author_email,
        u.avatar_url as author_avatar,
        s.name as slot_name,
        s.dispatch_time as slot_dispatch_time
      FROM cms_author_slot_assignments m
      LEFT JOIN cms_users u ON u.id::text = m.author_id::text
      JOIN cms_publishing_slots s ON s.id = m.slot_id
      WHERE m.author_id::text = $1::text
      LIMIT 1
    `;
    const res = await this.postgres.pool.query<AssignmentRow>(query, [authorId]);
    return res.rows[0] ? this.mapAssignment(res.rows[0]) : null;
  }

  async assignAuthorToSlot(dto: AssignAuthorSlotDto, assignedBy?: string): Promise<AuthorSlotAssignment> {
    await this.ensureSchema();
    const query = `
      INSERT INTO cms_author_slot_assignments (
        author_id, slot_id, auto_publish_enabled, daily_quota, assigned_by
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (author_id) DO UPDATE SET
        slot_id = EXCLUDED.slot_id,
        auto_publish_enabled = EXCLUDED.auto_publish_enabled,
        daily_quota = EXCLUDED.daily_quota,
        assigned_by = EXCLUDED.assigned_by
      RETURNING *
    `;
    const params = [
      dto.authorId,
      dto.slotId,
      dto.autoPublishEnabled !== false,
      dto.dailyQuota ?? 2,
      assignedBy || null,
    ];
    await this.postgres.pool.query(query, params);
    const populated = await this.findAssignmentByAuthorId(dto.authorId);
    if (!populated) throw new Error('Failed to retrieve created author slot assignment');
    return populated;
  }

  async revokeAuthorAssignment(authorId: string): Promise<boolean> {
    await this.ensureSchema();
    const query = `DELETE FROM cms_author_slot_assignments WHERE author_id::text = $1::text`;
    const res = await this.postgres.pool.query(query, [authorId]);
    return (res.rowCount ?? 0) > 0;
  }

  async getAuthorClearance(authorId: string): Promise<AuthorClearanceInfo> {
    await this.ensureSchema();
    const assignment = await this.findAssignmentByAuthorId(authorId);
    if (!assignment || !assignment.autoPublishEnabled) {
      return { hasSlot: false, slot: null, assignment: null, nextEstimatedPublishAt: null };
    }
    const slot = await this.findSlotById(assignment.slotId);
    return {
      hasSlot: true,
      slot,
      assignment,
      nextEstimatedPublishAt: slot ? slot.dispatchTime : null,
    };
  }

  async getQueuedArticlesCount(slotId: string): Promise<number> {
    await this.ensureSchema();
    const query = `SELECT COUNT(*) as total FROM articles WHERE publishing_slot_id = $1 AND status = 'scheduled'`;
    const res = await this.postgres.pool.query<{ total: string | number }>(query, [slotId]);
    return Number(res.rows[0]?.total ?? 0);
  }

  async getUpcomingScheduledArticles(limit = 10): Promise<any[]> {
    await this.ensureSchema();
    const query = `
      SELECT 
        a.id, a.title, a.slug, a.status, a.scheduled_at, a.cover_image, a.author_id,
        u.name as author_name, u.avatar_url as author_avatar,
        s.name as slot_name, s.dispatch_time as slot_dispatch_time
      FROM articles a
      LEFT JOIN cms_users u ON u.id::text = a.author_id::text
      LEFT JOIN cms_publishing_slots s ON s.id::text = a.publishing_slot_id::text
      WHERE a.status = 'scheduled'
      ORDER BY a.scheduled_at ASC NULLS LAST
      LIMIT $1
    `;
    const res = await this.postgres.pool.query(query, [limit]);
    return res.rows;
  }
}
