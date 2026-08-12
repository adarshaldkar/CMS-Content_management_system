import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import {
  AuditLogSchemaClass,
  AuditLogSchema,
} from '../../repositories/mongo/audit-log.schema';
import { PostgresAuditLogRepository } from '../../repositories/postgres/postgres-audit-log.repository';
import { MongoAuditLogRepository } from '../../repositories/mongo/mongo-audit-log.repository';
import { auditLogRepositoryProvider } from '../../repositories/repository.providers';
import { PostgresService } from '../../database/postgres.service';

import { AuditController } from './audit.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLogSchemaClass.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    PostgresService,
    PostgresAuditLogRepository,
    MongoAuditLogRepository,
    auditLogRepositoryProvider,
  ],
  exports: [AuditService, auditLogRepositoryProvider],
})
export class AuditModule {}
