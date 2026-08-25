import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { HighAssuranceAdminGuard } from '../../common/guards/admin-security.guard';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/decorators/security.decorators';
import {
  Permission,
  UserRole,
  type AuthUser,
  type PaginatedResult,
  type User,
} from '../../domain/models';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users with pagination and search' })
  @RequirePermissions(Permission.USER_READ_PROFILE)
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
  ): Promise<PaginatedResult<User>> {
    return this.usersService.findMany({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search,
      role,
    });
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role with strict hierarchy checks' })
  @RequirePermissions(Permission.USER_UPDATE_ROLE)
  async updateRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
    @CurrentUser() actor: AuthUser,
  ): Promise<User> {
    return this.usersService.updateRole(id, body.role, actor);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  @RequirePermissions(Permission.USER_UPDATE_ROLE)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() actor: AuthUser,
  ): Promise<User> {
    return this.usersService.updateStatus(id, body.isActive, actor);
  }
}
