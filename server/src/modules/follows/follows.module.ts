import { Module } from '@nestjs/common';
import { PostgresFollowRepository } from '../../repositories/postgres/postgres-follow.repository';
import { FOLLOW_REPOSITORY } from '../../repositories/interfaces/follow.repository.interface';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [FollowsController],
  providers: [
    FollowsService,
    PostgresService,
    PostgresFollowRepository,
    {
      provide: FOLLOW_REPOSITORY,
      useClass: PostgresFollowRepository,
    },
  ],
  exports: [FollowsService, FOLLOW_REPOSITORY],
})
export class FollowsModule {}
