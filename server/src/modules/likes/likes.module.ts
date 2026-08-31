import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostgresLikeRepository } from '../../repositories/postgres/postgres-like.repository';
import { MongoLikeRepository } from '../../repositories/mongo/mongo-like.repository';
import { LikeSchema, LikeSchemaClass } from '../../repositories/mongo/like.schema';
import { LIKE_REPOSITORY } from '../../repositories/interfaces/like.repository.interface';
import { likeRepositoryProvider } from '../../repositories/repository.providers';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: LikeSchemaClass.name, schema: LikeSchema },
    ]),
  ],
  controllers: [LikesController],
  providers: [
    LikesService,
    PostgresService,
    PostgresLikeRepository,
    MongoLikeRepository,
    likeRepositoryProvider,
  ],
  exports: [LikesService, likeRepositoryProvider],
})
export class LikesModule {}
