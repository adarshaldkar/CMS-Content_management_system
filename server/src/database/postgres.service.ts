import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { EnvConfig } from '../config/env.schema';

export const PG_POOL = Symbol('PG_POOL');

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  readonly pool: Pool;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    this.pool = new Pool({
      connectionString: this.config.get('DATABASE_URL', { infer: true }),
      max: 10,
      connectionTimeoutMillis: 5000,
    });

    // Attach error handler to prevent idle client pool errors from crashing Node process
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err.stack);
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
