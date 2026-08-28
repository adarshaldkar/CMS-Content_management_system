import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PublishingSlotsService } from './publishing-slots.service';
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
  type AuthUser,
  type CreatePublishingSlotDto,
  type UpdatePublishingSlotDto,
  type AssignAuthorSlotDto,
  type AuthorClearanceInfo,
  type PublishingSlot,
  type AuthorSlotAssignment,
} from '../../domain/models';

@ApiTags('publishing-slots')
@Controller()
export class PublishingSlotsController {
  constructor(private readonly slotsService: PublishingSlotsService) {}

  // ==========================================
  // Public Author Endpoint (Requires active user session)
  // ==========================================

  @Get('slots/my-clearance')
  @ApiOperation({ summary: 'Get active publishing slot and auto-dispatch clearance for logged-in author' })
  @UseGuards(JwtAuthGuard)
  async getMyClearance(@CurrentUser() user: AuthUser): Promise<AuthorClearanceInfo> {
    return this.slotsService.getAuthorClearance(user.id);
  }

  // ==========================================
  // Admin Governance Endpoints (High-Assurance Protected)
  // ==========================================

  @Get('admin/slots')
  @ApiOperation({ summary: 'List all editorial publishing slots with queue analytics' })
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
  @RequirePermissions(Permission.SLOT_READ)
  async listSlots(): Promise<PublishingSlot[]> {
    return this.slotsService.findAllSlots();
  }

  @Get('admin/slots/queue')
  @ApiOperation({ summary: 'Inspect upcoming scheduled auto-publishing pipeline' })
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
  @RequirePermissions(Permission.SLOT_READ)
  async getQueue(@Query('limit') limit = '20'): Promise<any[]> {
    return this.slotsService.getUpcomingQueue(parseInt(limit, 10) || 20);
  }

  @Post('admin/slots')
  @ApiOperation({ summary: 'Create a new automated publishing slot' })
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
  @RequirePermissions(Permission.SLOT_MANAGE)
  @Throttle({ 'admin-critical': { limit: 10, ttl: 60000 } })
  async createSlot(
    @Body() dto: CreatePublishingSlotDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<PublishingSlot> {
    return this.slotsService.createSlot(dto, actor);
  }

  @Patch('admin/slots/:id')
  @ApiOperation({ summary: 'Update an existing publishing slot configuration' })
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
  @RequirePermissions(Permission.SLOT_MANAGE)
  @Throttle({ 'admin-critical': { limit: 10, ttl: 60000 } })
  async updateSlot(
    @Param('id') id: string,
    @Body() dto: UpdatePublishingSlotDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<PublishingSlot> {
    return this.slotsService.updateSlot(id, dto, actor);
  }

  @Delete('admin/slots/:id')
  @ApiOperation({ summary: 'Delete a publishing slot' })
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
  @RequirePermissions(Permission.SLOT_MANAGE)
  @Throttle({ 'admin-critical': { limit: 10, ttl: 60000 } })
  async deleteSlot(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ): Promise<{ success: boolean }> {
    const success = await this.slotsService.deleteSlot(id, actor);
    return { success };
  }

  @Get('admin/slots/assignments')
  @ApiOperation({ summary: 'List all authors assigned to automated publishing slots' })
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
  @RequirePermissions(Permission.SLOT_READ)
  async listAssignments(): Promise<AuthorSlotAssignment[]> {
    return this.slotsService.findAllAssignments();
  }

  @Post('admin/slots/assignments')
  @ApiOperation({ summary: 'Assign an author to a publishing slot with auto-publish privileges' })
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
  @RequirePermissions(Permission.SLOT_MANAGE)
  @Throttle({ 'admin-critical': { limit: 20, ttl: 60000 } })
  async assignAuthor(
    @Body() dto: AssignAuthorSlotDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<AuthorSlotAssignment> {
    return this.slotsService.assignAuthor(dto, actor);
  }

  @Delete('admin/slots/assignments/:authorId')
  @ApiOperation({ summary: 'Revoke automated publishing slot privileges from an author' })
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
  @RequirePermissions(Permission.SLOT_MANAGE)
  @Throttle({ 'admin-critical': { limit: 20, ttl: 60000 } })
  async revokeAuthor(
    @Param('authorId') authorId: string,
    @CurrentUser() actor: AuthUser,
  ): Promise<{ success: boolean }> {
    const success = await this.slotsService.revokeAuthorAssignment(authorId, actor);
    return { success };
  }
}
