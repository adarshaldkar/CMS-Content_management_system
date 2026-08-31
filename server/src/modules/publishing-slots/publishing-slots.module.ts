import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublishingSlotsService } from './publishing-slots.service';
import { PublishingSlotsController } from './publishing-slots.controller';
import { PostgresPublishingSlotRepository } from '../../repositories/postgres/postgres-publishing-slot.repository';
import { MongoPublishingSlotRepository } from '../../repositories/mongo/mongo-publishing-slot.repository';
import {
  AuthorSlotAssignmentSchema,
  AuthorSlotAssignmentSchemaClass,
  PublishingSlotSchema,
  PublishingSlotSchemaClass,
} from '../../repositories/mongo/publishing-slot.schema';
import { publishingSlotRepositoryProvider } from '../../repositories/repository.providers';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => UsersModule),
    MongooseModule.forFeature([
      { name: PublishingSlotSchemaClass.name, schema: PublishingSlotSchema },
      {
        name: AuthorSlotAssignmentSchemaClass.name,
        schema: AuthorSlotAssignmentSchema,
      },
    ]),
  ],
  controllers: [PublishingSlotsController],
  providers: [
    PublishingSlotsService,
    PostgresPublishingSlotRepository,
    MongoPublishingSlotRepository,
    publishingSlotRepositoryProvider,
  ],
  exports: [
    PublishingSlotsService,
    publishingSlotRepositoryProvider,
  ],
})
export class PublishingSlotsModule {}
