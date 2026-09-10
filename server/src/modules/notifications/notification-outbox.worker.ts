import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../../bull/bull-queue.constants';
import { CreateNotificationDto } from '../../domain/models';
import { NotificationsService } from './notifications.service';

@Processor(QUEUE_NAMES.NOTIFICATION_OUTBOX, {
  concurrency: 5,
  lockDuration: 30000,
  stalledInterval: 30000,
  maxStalledCount: 2,
})
@Injectable()
export class NotificationOutboxWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationOutboxWorker.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<{ dto: CreateNotificationDto }>): Promise<Record<string, unknown>> {
    const { dto } = job.data;

    if (!dto || !dto.userId || !dto.type || !dto.resourceId) {
      throw new Error('Malformed notification outbox job payload.');
    }

    try {
      const notification = await this.notificationsService.notify(dto);
      return { delivered: true, notificationId: notification?.id || null };
    } catch (err: any) {
      this.logger.error(
        `Notification outbox job [${job.id}] failed for [${dto.userId}]: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}