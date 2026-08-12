import { Module } from '@nestjs/common';
import { PostgresCommentRepository } from '../../repositories/postgres/postgres-comment.repository';
import { COMMENT_REPOSITORY } from '../../repositories/interfaces/comment.repository.interface';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    PostgresService,
    PostgresCommentRepository,
    {
      provide: COMMENT_REPOSITORY,
      useClass: PostgresCommentRepository,
    },
  ],
  exports: [CommentsService, COMMENT_REPOSITORY],
})
export class CommentsModule {}
