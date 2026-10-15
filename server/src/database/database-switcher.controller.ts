import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DatabaseSwitcherService, type DatabaseHealthStatus } from './database-switcher.service';
import type { DatabaseEngine } from './multi-database-mesh.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { HighAssuranceAdminGuard } from '../common/guards/admin-security.guard';
import { CurrentUser, RequirePermissions } from '../common/decorators/security.decorators';
import { Permission, type AuthUser } from '../domain/models';

import { AutoFailoverService } from './auto-failover.service';

@ApiTags('database')
@Controller('database')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
export class DatabaseSwitcherController {
  constructor(
    private readonly switcherService: DatabaseSwitcherService,
    private readonly autoFailoverService: AutoFailoverService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get real-time database connection status and health across all 6 engines' })
  @RequirePermissions(Permission.AUDIT_READ)
  async getStatus(): Promise<DatabaseHealthStatus & { autoFailover: any }> {
    const status = await this.switcherService.getStatus();
    return {
      ...status,
      autoFailover: this.autoFailoverService.getStatus(),
    };
  }

  @Post('switch')
  @ApiOperation({ summary: 'Atomically switch active database with mutex' })
  @RequirePermissions(Permission.DATABASE_SWITCH)
  @Throttle({ 'admin-critical': { limit: 5, ttl: 60000 } })
  async switchDb(
    @Body() body: { targetDatabase: DatabaseEngine },
    @CurrentUser() user: AuthUser,
  ) {
    return this.switcherService.switchDatabase(body.targetDatabase, user);
  }

  @Post('auto-failover/reset')
  @ApiOperation({ summary: 'Clear manual database override and restore PostgreSQL primary priority' })
  @RequirePermissions(Permission.DATABASE_SWITCH)
  async resetAutoFailover() {
    this.autoFailoverService.resetManualOverride();
    return {
      success: true,
      message: 'Manual override cleared. Automatic failover and primary restoration sentinel active.',
    };
  }
}

