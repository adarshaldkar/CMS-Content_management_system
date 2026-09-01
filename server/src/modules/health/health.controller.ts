import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/security.decorators';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Application health check' })
  check() {
    return this.healthService.getStatus();
  }

  @Public()
  @Get('redis')
  @ApiOperation({ summary: 'Redis L2 cache & cluster telemetry' })
  getRedisStats() {
    return this.healthService.getRedisStats();
  }

  @Public()
  @Post('redis/purge')
  @ApiOperation({ summary: 'Purge all L2 cached keys' })
  purgeRedisCache() {
    return this.healthService.purgeRedisCache();
  }
}
