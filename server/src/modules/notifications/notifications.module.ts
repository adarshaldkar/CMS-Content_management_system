import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { PostgresService } from '../../database/postgres.service';
import {
  NotificationPreferencesSchema,
  NotificationPreferencesSchemaClass,
  NotificationSchema,
  NotificationSchemaClass,
  PushSubscriptionSchema,
  PushSubscriptionSchemaClass,
} from '../../repositories/mongo/notification.schema';
import { PostgresNotificationRepository } from '../../repositories/postgres/postgres-notification.repository';
import { MongoNotificationRepository } from '../../repositories/mongo/mongo-notification.repository';
import { notificationRepositoryProvider } from '../../repositories/repository.providers';
import { QUEUE_NAMES } from '../../bull/bull-queue.constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationOutboxWorker } from './notification-outbox.worker';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationSchemaClass.name, schema: NotificationSchema },
      { name: NotificationPreferencesSchemaClass.name, schema: NotificationPreferencesSchema },
      { name: PushSubscriptionSchemaClass.name, schema: PushSubscriptionSchema },
    ]),
    BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATION_OUTBOX }),
  ],
  controllers: [NotificationsController],
  providers: [
    PostgresService,
    PostgresNotificationRepository,
    MongoNotificationRepository,
    notificationRepositoryProvider,
    NotificationsService,
    NotificationOutboxWorker,
  ],
  exports: [NotificationsService, notificationRepositoryProvider],
})
export class NotificationsModule {}
