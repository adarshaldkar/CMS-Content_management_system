import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/security.decorators';
import { Permission, type AuditLog } from '../../domain/models';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Query immutable security audit logs' })
  @RequirePermissions(Permission.AUDIT_READ)
  async list(@Query('limit') limit = '50'): Promise<AuditLog[]> {
    return this.auditService.getRecentLogs(parseInt(limit, 10) || 50);
  }
}
