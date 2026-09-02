import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { JobsAdminService } from './jobs-admin.service';
import { JobsAdminController } from './jobs-admin.controller';

@Module({
  imports: [AuditModule],
  controllers: [JobsAdminController],
  providers: [JobsAdminService],
  exports: [JobsAdminService],
})
export class JobsModule {}
