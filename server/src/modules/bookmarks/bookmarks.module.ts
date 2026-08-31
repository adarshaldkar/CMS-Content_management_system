import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostgresBookmarkRepository } from '../../repositories/postgres/postgres-bookmark.repository';
import { MongoBookmarkRepository } from '../../repositories/mongo/mongo-bookmark.repository';
import {
  BookmarkSchema,
  BookmarkSchemaClass,
} from '../../repositories/mongo/bookmark.schema';
import { BOOKMARK_REPOSITORY } from '../../repositories/interfaces/bookmark.repository.interface';
import { bookmarkRepositoryProvider } from '../../repositories/repository.providers';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: BookmarkSchemaClass.name, schema: BookmarkSchema },
    ]),
  ],
  controllers: [BookmarksController],
  providers: [
    BookmarksService,
    PostgresService,
    PostgresBookmarkRepository,
    MongoBookmarkRepository,
    bookmarkRepositoryProvider,
  ],
  exports: [BookmarksService, bookmarkRepositoryProvider],
})
export class BookmarksModule {}
