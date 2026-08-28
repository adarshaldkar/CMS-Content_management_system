import { forwardRef, Module } from '@nestjs/common';
import { PublishingSlotsService } from './publishing-slots.service';
import { PublishingSlotsController } from './publishing-slots.controller';
import { PostgresPublishingSlotRepository } from '../../repositories/postgres/postgres-publishing-slot.repository';
import { publishingSlotRepositoryProvider } from '../../repositories/repository.providers';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [PublishingSlotsController],
  providers: [
    PublishingSlotsService,
    PostgresPublishingSlotRepository,
    publishingSlotRepositoryProvider,
  ],
  exports: [
    PublishingSlotsService,
    publishingSlotRepositoryProvider,
  ],
})
export class PublishingSlotsModule {}
