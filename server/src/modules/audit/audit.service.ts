import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AUDIT_LOG_REPOSITORY,
  type IAuditLogRepository,
} from '../../repositories/interfaces/audit-log.repository.interface';
import {
  AuditEventType,
  type AuditLog,
  type CreateAuditLogDto,
} from '../../domain/models';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async log(data: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const created = await this.auditRepo.create(data);
      this.logger.log(
        `[AUDIT] Action: ${data.action} | Resource: ${data.resource} | Result: ${data.result} | Actor: ${data.actorId || 'Anonymous'}`,
      );
      return created;
    } catch (err) {
      this.logger.error('Failed to persist audit log', (err as Error).stack);
      // Return fallback memory structure so system execution never fails on audit write error
      return {
        id: 'fallback-' + Date.now(),
        actorId: data.actorId ?? null,
        action: data.action,
        resource: data.resource,
        result: data.result,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        referenceId: data.referenceId ?? null,
        metadata: data.metadata ?? null,
        createdAt: new Date(),
      };
    }
  }

  async getRecentLogs(limit = 50): Promise<AuditLog[]> {
    return this.auditRepo.findRecent(limit);
  }
}
