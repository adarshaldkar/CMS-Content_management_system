import type { AuditLog, CreateAuditLogDto } from '../../domain/models';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface IAuditLogRepository {
  create(data: CreateAuditLogDto): Promise<AuditLog>;
  findRecent(limit?: number): Promise<AuditLog[]>;
}
