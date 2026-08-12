import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import {
  MediaSchemaClass,
  MediaSchema,
} from '../../repositories/mongo/media.schema';
import { PostgresMediaRepository } from '../../repositories/postgres/postgres-media.repository';
import { MongoMediaRepository } from '../../repositories/mongo/mongo-media.repository';
import { mediaRepositoryProvider } from '../../repositories/repository.providers';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: MediaSchemaClass.name, schema: MediaSchema },
    ]),
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    PostgresService,
    PostgresMediaRepository,
    MongoMediaRepository,
    mediaRepositoryProvider,
  ],
  exports: [MediaService, mediaRepositoryProvider],
})
export class MediaModule {}
