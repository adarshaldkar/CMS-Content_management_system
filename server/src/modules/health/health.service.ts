import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.schema';

@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  getStatus() {
    return {
      status: 'ok',
      phase: 'foundation',
      timestamp: new Date().toISOString(),
      activeDatabase:
        (process.env.ACTIVE_DATABASE as any) ||
        this.config.get('ACTIVE_DATABASE', { infer: true }) ||
        'postgres',
    };
  }
}
