import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.schema';
import { QUEUE_NAMES } from './bull-queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => {
        const host = configService.get('REDIS_HOST', { infer: true });
        const port = configService.get('REDIS_PORT', { infer: true });
        const password = configService.get('REDIS_PASSWORD', { infer: true });
        const db = configService.get('REDIS_DB', { infer: true });

        return {
          prefix: 'bull:cms',
          connection: {
            host,
            port,
            password: password || undefined,
            db,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          defaultJobOptions: {
            removeOnComplete: 500,
            removeOnFail: false, // Keep in Dead-Letter Queue (DLQ)
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 3000,
            },
          },
        };
      },
    }),
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.SCHEDULED_PUBLISHING,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 500,
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_NAMES.NOTIFICATION_OUTBOX,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_NAMES.NEWSLETTER_BROADCAST,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: 1000,
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_NAMES.MESH_RECONCILIATION,
        defaultJobOptions: {
          attempts: 10,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 2000,
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_NAMES.ANALYTICS_ROLLUP,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'fixed', delay: 30000 },
          removeOnComplete: 100,
          removeOnFail: false,
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class BullQueueModule {}
