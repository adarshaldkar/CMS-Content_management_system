import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostgresCommentRepository } from '../../repositories/postgres/postgres-comment.repository';
import { MongoCommentRepository } from '../../repositories/mongo/mongo-comment.repository';
import {
  CommentSchema,
  CommentSchemaClass,
} from '../../repositories/mongo/comment.schema';
import { COMMENT_REPOSITORY } from '../../repositories/interfaces/comment.repository.interface';
import { commentRepositoryProvider } from '../../repositories/repository.providers';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: CommentSchemaClass.name, schema: CommentSchema },
    ]),
  ],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    PostgresService,
    PostgresCommentRepository,
    MongoCommentRepository,
    commentRepositoryProvider,
  ],
  exports: [CommentsService, commentRepositoryProvider],
})
export class CommentsModule {}
