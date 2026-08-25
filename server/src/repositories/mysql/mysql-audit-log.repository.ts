import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuditEventType, AuditLog, CreateAuditLogDto } from '../../domain/models';
import { MySqlService } from '../../database/mysql.service';
import type { IAuditLogRepository } from '../interfaces/audit-log.repository.interface';

@Injectable()
export class MySqlAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly mysql: MySqlService) {}

  private mapRow(row: any): AuditLog {
    let metadata: Record<string, unknown> | null = null;
    try {
      if (typeof row.metadata === 'string') metadata = JSON.parse(row.metadata);
      else if (row.metadata) metadata = row.metadata;
    } catch {
      metadata = null;
    }

    return {
      id: row.id,
      actorId: row.actor_id || null,
      action: row.action as AuditEventType,
      resource: row.resource,
      result: (row.result as 'SUCCESS' | 'FAILURE' | 'BLOCKED') || 'SUCCESS',
      ipAddress: row.ip_address || null,
      userAgent: row.user_agent || null,
      referenceId: row.reference_id || null,
      metadata,
      createdAt: new Date(row.created_at),
    };
  }

  async create(data: CreateAuditLogDto): Promise<AuditLog> {
    await this.mysql.ensureSchema();
    const id = randomUUID();
    const metadataStr = data.metadata ? JSON.stringify(data.metadata) : null;

    await this.mysql.pool.query(
      `INSERT INTO audit_logs (id, actor_id, action, resource, result, ip_address, user_agent, reference_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.actorId ?? null,
        data.action,
        data.resource,
        data.result,
        data.ipAddress ?? null,
        data.userAgent ?? null,
        data.referenceId ?? null,
        metadataStr,
      ],
    );

    const [rows] = (await this.mysql.pool.query(
      'SELECT * FROM audit_logs WHERE id = ? LIMIT 1',
      [id],
    )) as any;
    return this.mapRow(rows[0]);
  }

  async findRecent(limit = 100): Promise<AuditLog[]> {
    await this.mysql.ensureSchema();
    const [rows] = (await this.mysql.pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?',
      [limit],
    )) as any;
    return (rows || []).map((r: any) => this.mapRow(r));
  }
}
