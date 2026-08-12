import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { AuditEventType, AuditLog, CreateAuditLogDto } from '../../domain/models';
import { PostgresService } from '../../database/postgres.service';
import type { IAuditLogRepository } from '../interfaces/audit-log.repository.interface';

interface AuditRow extends QueryResultRow {
  id: string;
  actor_id: string | null;
  action: string;
  resource: string;
  result: string;
  ip_address: string | null;
  user_agent: string | null;
  reference_id: string | null;
  metadata: unknown;
  created_at: Date;
}

@Injectable()
export class PostgresAuditLogRepository implements IAuditLogRepository {
  private ready: Promise<void> | null = null;

  constructor(private readonly postgres: PostgresService) {}

  private async ensureSchema(): Promise<void> {
    this.ready ??= this.postgres.pool
      .query(
        `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS cms_audit_logs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_id text,
          action text NOT NULL,
          resource text NOT NULL,
          result text NOT NULL,
          ip_address text,
          user_agent text,
          reference_id text,
          metadata jsonb,
          created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_created_at ON cms_audit_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON cms_audit_logs(actor_id);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON cms_audit_logs(action);
      `,
      )
      .then(() => undefined);

    await this.ready;
  }

  private toDomain(row: AuditRow): AuditLog {
    return {
      id: row.id,
      actorId: row.actor_id,
      action: row.action as AuditEventType,
      resource: row.resource,
      result: row.result as 'SUCCESS' | 'FAILURE' | 'BLOCKED',
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      referenceId: row.reference_id,
      metadata: (row.metadata as Record<string, unknown>) ?? null,
      createdAt: row.created_at,
    };
  }

  async create(data: CreateAuditLogDto): Promise<AuditLog> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<AuditRow>(
      `
      INSERT INTO cms_audit_logs (
        actor_id, action, resource, result, ip_address, user_agent, reference_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        data.actorId ?? null,
        data.action,
        data.resource,
        data.result,
        data.ipAddress ?? null,
        data.userAgent ?? null,
        data.referenceId ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ],
    );
    return this.toDomain(result.rows[0]);
  }

  async findRecent(limit = 100): Promise<AuditLog[]> {
    await this.ensureSchema();
    const result = await this.postgres.pool.query<AuditRow>(
      'SELECT * FROM cms_audit_logs ORDER BY created_at DESC LIMIT $1',
      [Math.min(limit, 500)],
    );
    return result.rows.map((row) => this.toDomain(row));
  }
}
