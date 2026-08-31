import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostgresFollowRepository } from '../../repositories/postgres/postgres-follow.repository';
import { MongoFollowRepository } from '../../repositories/mongo/mongo-follow.repository';
import {
  FollowSchema,
  FollowSchemaClass,
} from '../../repositories/mongo/follow.schema';
import { FOLLOW_REPOSITORY } from '../../repositories/interfaces/follow.repository.interface';
import { followRepositoryProvider } from '../../repositories/repository.providers';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: FollowSchemaClass.name, schema: FollowSchema },
    ]),
  ],
  controllers: [FollowsController],
  providers: [
    FollowsService,
    PostgresService,
    PostgresFollowRepository,
    MongoFollowRepository,
    followRepositoryProvider,
  ],
  exports: [FollowsService, followRepositoryProvider],
})
export class FollowsModule {}
