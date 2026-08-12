import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseSwitcherService, type DatabaseHealthStatus } from './database-switcher.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../common/decorators/security.decorators';
import { Permission, type AuthUser } from '../domain/models';

@ApiTags('database')
@Controller('database')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
export class DatabaseSwitcherController {
  constructor(private readonly switcherService: DatabaseSwitcherService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get real-time database connection status and health' })
  @RequirePermissions(Permission.AUDIT_READ)
  async getStatus(): Promise<DatabaseHealthStatus> {
    return this.switcherService.getStatus();
  }

  @Post('switch')
  @ApiOperation({ summary: 'Atomically switch active database with mutex' })
  @RequirePermissions(Permission.DATABASE_SWITCH)
  async switchDb(
    @Body() body: { targetDatabase: 'postgres' | 'mongodb' },
    @CurrentUser() user: AuthUser,
  ) {
    return this.switcherService.switchDatabase(body.targetDatabase, user);
  }
}
