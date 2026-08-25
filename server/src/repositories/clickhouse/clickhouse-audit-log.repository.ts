import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuditEventType, AuditLog, CreateAuditLogDto } from '../../domain/models';
import { ClickHouseService } from '../../database/clickhouse.service';
import type { IAuditLogRepository } from '../interfaces/audit-log.repository.interface';

@Injectable()
export class ClickHouseAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly clickhouse: ClickHouseService) {}

  async create(data: CreateAuditLogDto): Promise<AuditLog> {
    await this.clickhouse.ensureSchema();
    const id = randomUUID();
    const createdAt = new Date();

    await this.clickhouse.client.insert({
      table: 'cms_platform.audit_events',
      values: [
        {
          id,
          action: data.action,
          user_id: data.actorId || '',
          user_email: '',
          resource_type: data.resource,
          resource_id: '',
          ip_address: data.ipAddress || '',
          user_agent: data.userAgent || '',
          status: data.result || 'SUCCESS',
          reference_id: data.referenceId || '',
        },
      ],
      format: 'JSONEachRow',
    });

    return {
      id,
      action: data.action as AuditEventType,
      actorId: data.actorId || null,
      resource: data.resource,
      result: data.result,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      metadata: data.metadata || null,
      referenceId: data.referenceId || null,
      createdAt,
    };
  }

  async findRecent(limit = 100): Promise<AuditLog[]> {
    await this.clickhouse.ensureSchema();
    const res = await this.clickhouse.client.query({
      query: 'SELECT * FROM cms_platform.audit_events ORDER BY timestamp DESC LIMIT {limit:UInt32}',
      query_params: { limit },
      format: 'JSONEachRow',
    });
    const rows = await res.json<any>();
    return rows.map((r: any) => ({
      id: r.id,
      action: r.action as AuditEventType,
      actorId: r.user_id || null,
      resource: r.resource_type || '',
      result: (r.status as 'SUCCESS' | 'FAILURE' | 'BLOCKED') || 'SUCCESS',
      ipAddress: r.ip_address || null,
      userAgent: r.user_agent || null,
      status: r.status || 'SUCCESS',
      metadata: null,
      referenceId: r.reference_id || null,
      createdAt: new Date(r.timestamp),
    }));
  }
}
