import { Module } from '@nestjs/common';
import { PostgresBookmarkRepository } from '../../repositories/postgres/postgres-bookmark.repository';
import { BOOKMARK_REPOSITORY } from '../../repositories/interfaces/bookmark.repository.interface';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { PostgresService } from '../../database/postgres.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BookmarksController],
  providers: [
    BookmarksService,
    PostgresService,
    PostgresBookmarkRepository,
    {
      provide: BOOKMARK_REPOSITORY,
      useClass: PostgresBookmarkRepository,
    },
  ],
  exports: [BookmarksService, BOOKMARK_REPOSITORY],
})
export class BookmarksModule {}
