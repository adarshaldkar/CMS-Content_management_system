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

@ApiTags('database')
@Controller('database')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
export class DatabaseSwitcherController {
  constructor(private readonly switcherService: DatabaseSwitcherService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get real-time database connection status and health across all 6 engines' })
  @RequirePermissions(Permission.AUDIT_READ)
  async getStatus(): Promise<DatabaseHealthStatus> {
    return this.switcherService.getStatus();
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
}

