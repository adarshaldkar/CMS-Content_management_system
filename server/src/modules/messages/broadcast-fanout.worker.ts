// server/src/modules/messages/broadcast-fanout.worker.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../../bull/bull-queue.constants';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from '../../repositories/interfaces/conversation.repository.interface';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../repositories/interfaces/user.repository.interface';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { AuditEventType, UserRole } from '../../domain/models';

export interface BroadcastJobData {
  broadcastId: string;
  targetRole: string;
  authorId: string;
  title: string;
}

@Injectable()
@Processor(QUEUE_NAMES.BROADCAST_FANOUT, { concurrency: 2 })
export class BroadcastFanoutWorker extends WorkerHost {
  private readonly logger = new Logger(BroadcastFanoutWorker.name);

  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly convRepo: IConversationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<BroadcastJobData>): Promise<{ dispatched: number }> {
    if (job.name !== JOB_NAMES.DISPATCH_BROADCAST_BATCH) {
      return { dispatched: 0 };
    }

    const { broadcastId, targetRole, authorId, title } = job.data;
    this.logger.log(`[BroadcastFanout] Processing broadcast ${broadcastId} for target role: ${targetRole}`);

    await this.convRepo.updateBroadcastStatus(broadcastId, 'PROCESSING');

    // 1. Resolve recipients based on target role
    let usersList: any[] = [];
    const roleFilter = targetRole === 'ALL' ? undefined : (targetRole as UserRole);

    const userRes = await this.userRepo.findMany({
      role: roleFilter,
      isActive: true,
      limit: 1000,
    });
    usersList = userRes.items;

    const userIds = usersList.map((u) => u.id);
    const totalRecipients = userIds.length;

    // 2. Batch fan-out in chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + CHUNK_SIZE);
      await this.convRepo.recordBroadcastRecipientBatch(broadcastId, chunk);
    }

    // 3. Update status to COMPLETED
    await this.convRepo.updateBroadcastStatus(broadcastId, 'COMPLETED', totalRecipients);

    // 4. Redis PubSub notification event for real-time SSE stream delivery
    if (this.redisService.isHealthy()) {
      const client = this.redisService.getClient();
      if (client) {
        try {
          const payload = JSON.stringify({
            event: 'BROADCAST_ANNOUNCEMENT',
            broadcastId,
            title,
            targetRole,
            timestamp: new Date().toISOString(),
          });
          await client.publish('channel:broadcasts', payload);
        } catch (err: any) {
          this.logger.warn(`Redis broadcast pub/sub note: ${err.message}`);
        }
      }
    }

    // 5. Audit trail
    await this.auditService.log({
      actorId: authorId,
      action: AuditEventType.SYSTEM_ALERT,
      resource: `Broadcast:${broadcastId}`,
      result: 'SUCCESS',
      metadata: {
        totalRecipients,
        targetRole,
        title,
      },
    });

    this.logger.log(`[BroadcastFanout] Completed broadcast ${broadcastId} to ${totalRecipients} recipients.`);
    return { dispatched: totalRecipients };
  }
}
