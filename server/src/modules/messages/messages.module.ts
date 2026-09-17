// server/src/modules/messages/messages.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../bull/bull-queue.constants';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { BroadcastFanoutWorker } from './broadcast-fanout.worker';
import { ConversationSchemaClass, ConversationSchema, BroadcastSchemaClass, BroadcastSchema } from '../../repositories/mongo/conversation.schema';
import { PostgresConversationRepository } from '../../repositories/postgres/postgres-conversation.repository';
import { MongoConversationRepository } from '../../repositories/mongo/mongo-conversation.repository';
import { SeamlessConversationRepository } from '../../repositories/seamless/seamless-conversation.repository';
import { CONVERSATION_REPOSITORY } from '../../repositories/interfaces/conversation.repository.interface';
import { USER_REPOSITORY } from '../../repositories/interfaces/user.repository.interface';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuditModule,
    UsersModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.BROADCAST_FANOUT,
    }),
    MongooseModule.forFeature([
      { name: ConversationSchemaClass.name, schema: ConversationSchema },
      { name: BroadcastSchemaClass.name, schema: BroadcastSchema },
    ]),
  ],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    BroadcastFanoutWorker,
    PostgresService,
    PostgresConversationRepository,
    MongoConversationRepository,
    {
      provide: CONVERSATION_REPOSITORY,
      useFactory: (
        postgresRepo: PostgresConversationRepository,
        mongoRepo: MongoConversationRepository,
      ) => {
        return new SeamlessConversationRepository(postgresRepo, mongoRepo);
      },
      inject: [PostgresConversationRepository, MongoConversationRepository],
    },
  ],
  exports: [MessagesService, CONVERSATION_REPOSITORY],
})
export class MessagesModule {}
