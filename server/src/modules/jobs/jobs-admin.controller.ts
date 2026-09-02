import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JobsAdminService } from './jobs-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { HighAssuranceAdminGuard } from '../../common/guards/admin-security.guard';
import { RequirePermissions } from '../../common/decorators/security.decorators';
import { Permission } from '../../domain/models';
import type {
  QueueSummaryDto,
  PaginatedJobsDto,
  JobDetailDto,
  CleanQueueDto,
} from './dto/job-admin.dto';

@ApiTags('admin-queues')
@Controller('admin/queues')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard, HighAssuranceAdminGuard)
export class JobsAdminController {
  constructor(private readonly jobsAdminService: JobsAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get real-time operational summaries and metrics for all queues' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  async getQueues(): Promise<QueueSummaryDto[]> {
    return this.jobsAdminService.getQueueSummaries();
  }

  @Get(':queueName/jobs')
  @ApiOperation({ summary: 'Get paginated jobs in a queue filtered by state' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  async getJobs(
    @Param('queueName') queueName: string,
    @Query('state') state: 'active' | 'waiting' | 'delayed' | 'failed' | 'completed' = 'failed',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<PaginatedJobsDto> {
    return this.jobsAdminService.getJobs(
      queueName,
      state,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Get(':queueName/jobs/:jobId')
  @ApiOperation({ summary: 'Inspect sanitized diagnostic details of a single job' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  async getJobDetail(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<JobDetailDto> {
    return this.jobsAdminService.getJobDetail(queueName, jobId);
  }

  @Post(':queueName/jobs/:jobId/retry')
  @ApiOperation({ summary: 'Re-enqueue a single failed DLQ job' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  @Throttle({ 'admin-critical': { limit: 30, ttl: 60000 } })
  async retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<{ success: boolean; jobId: string }> {
    return this.jobsAdminService.retryJob(queueName, jobId);
  }

  @Post(':queueName/retry-all-failed')
  @ApiOperation({ summary: 'Bulk retry all failed DLQ jobs in a queue' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  @Throttle({ 'admin-critical': { limit: 5, ttl: 60000 } })
  async retryAllFailed(
    @Param('queueName') queueName: string,
  ): Promise<{ success: boolean; count: number }> {
    return this.jobsAdminService.retryAllFailed(queueName);
  }

  @Delete(':queueName/jobs/:jobId')
  @ApiOperation({ summary: 'Permanently remove a job from queue' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  async removeJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<{ success: boolean }> {
    return this.jobsAdminService.removeJob(queueName, jobId);
  }

  @Post(':queueName/pause')
  @ApiOperation({ summary: 'Pause queue processing' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  async pauseQueue(
    @Param('queueName') queueName: string,
  ): Promise<{ paused: boolean }> {
    return this.jobsAdminService.pauseQueue(queueName);
  }

  @Post(':queueName/resume')
  @ApiOperation({ summary: 'Resume queue processing' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  async resumeQueue(
    @Param('queueName') queueName: string,
  ): Promise<{ paused: boolean }> {
    return this.jobsAdminService.resumeQueue(queueName);
  }

  @Post(':queueName/clean')
  @ApiOperation({ summary: 'Clean completed or failed jobs older than grace period' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  async cleanQueue(
    @Param('queueName') queueName: string,
    @Body() dto: CleanQueueDto,
  ): Promise<{ removedCount: number }> {
    return this.jobsAdminService.cleanQueue(queueName, dto);
  }

  @Post(':queueName/dispatch-test')
  @ApiOperation({ summary: 'Dispatch test delayed or simulated DLQ job for operational drills' })
  @RequirePermissions(Permission.SYSTEM_MAINTENANCE)
  async dispatchTest(
    @Param('queueName') queueName: string,
    @Body() body: { type?: 'delayed' | 'simulate-dlq' | 'immediate' },
  ): Promise<{ success: boolean; jobId: string; type: string }> {
    return this.jobsAdminService.dispatchTestJob(queueName, body.type || 'delayed');
  }
}
