import { Module } from '@nestjs/common';
import { PostgresLikeRepository } from '../../repositories/postgres/postgres-like.repository';
import { LIKE_REPOSITORY } from '../../repositories/interfaces/like.repository.interface';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [LikesController],
  providers: [
    LikesService,
    PostgresService,
    PostgresLikeRepository,
    {
      provide: LIKE_REPOSITORY,
      useClass: PostgresLikeRepository,
    },
  ],
  exports: [LikesService, LIKE_REPOSITORY],
})
export class LikesModule {}
