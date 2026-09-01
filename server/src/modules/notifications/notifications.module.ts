import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationSchemaClass.name, schema: NotificationSchema },
      { name: NotificationPreferencesSchemaClass.name, schema: NotificationPreferencesSchema },
      { name: PushSubscriptionSchemaClass.name, schema: PushSubscriptionSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    PostgresService,
    PostgresNotificationRepository,
    MongoNotificationRepository,
    notificationRepositoryProvider,
    NotificationsService,
  ],
  exports: [NotificationsService, notificationRepositoryProvider],
})
export class NotificationsModule {}
