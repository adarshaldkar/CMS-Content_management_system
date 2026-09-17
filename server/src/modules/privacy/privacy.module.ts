import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { AuditModule } from '../audit/audit.module';
import { userRepositoryProvider } from '../../repositories/repository.providers';
import { sessionRepositoryProvider } from '../../repositories/repository.providers';
import { articleRepositoryProvider } from '../../repositories/repository.providers';
import { bookmarkRepositoryProvider } from '../../repositories/repository.providers';
import { commentRepositoryProvider } from '../../repositories/repository.providers';
import { PostgresService } from '../../database/postgres.service';
import { PostgresUserRepository } from '../../repositories/postgres/postgres-user.repository';
import { MongoUserRepository } from '../../repositories/mongo/mongo-user.repository';
import { PostgresSessionRepository } from '../../repositories/postgres/postgres-session.repository';
import { MongoSessionRepository } from '../../repositories/mongo/mongo-session.repository';
import { PostgresArticleRepository } from '../../repositories/postgres/postgres-article.repository';
import { MongoArticleRepository } from '../../repositories/mongo/mongo-article.repository';
import { PostgresBookmarkRepository } from '../../repositories/postgres/postgres-bookmark.repository';
import { MongoBookmarkRepository } from '../../repositories/mongo/mongo-bookmark.repository';
import { PostgresCommentRepository } from '../../repositories/postgres/postgres-comment.repository';
import { MongoCommentRepository } from '../../repositories/mongo/mongo-comment.repository';
import { UserSchemaClass, UserSchema } from '../../repositories/mongo/user.schema';
import { SessionSchemaClass, SessionSchema } from '../../repositories/mongo/session.schema';
import { ArticleSchemaClass, ArticleSchema } from '../../repositories/mongo/article.schema';
import { CategorySchemaClass, CategorySchema } from '../../repositories/mongo/category.schema';
import { BookmarkSchemaClass, BookmarkSchema } from '../../repositories/mongo/bookmark.schema';
import { CommentSchemaClass, CommentSchema } from '../../repositories/mongo/comment.schema';
import { MariaDbService } from '../../database/mariadb.service';
import { MySqlService } from '../../database/mysql.service';
import { CockroachDbService } from '../../database/cockroach.service';
import { ClickHouseService } from '../../database/clickhouse.service';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: UserSchemaClass.name, schema: UserSchema },
      { name: SessionSchemaClass.name, schema: SessionSchema },
      { name: ArticleSchemaClass.name, schema: ArticleSchema },
      { name: CategorySchemaClass.name, schema: CategorySchema },
      { name: BookmarkSchemaClass.name, schema: BookmarkSchema },
      { name: CommentSchemaClass.name, schema: CommentSchema },
    ]),
  ],
  controllers: [PrivacyController],
  providers: [
    PrivacyService,
    PostgresService,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    ClickHouseService,
    PostgresUserRepository,
    MongoUserRepository,
    PostgresSessionRepository,
    MongoSessionRepository,
    PostgresArticleRepository,
    MongoArticleRepository,
    PostgresBookmarkRepository,
    MongoBookmarkRepository,
    PostgresCommentRepository,
    MongoCommentRepository,
    userRepositoryProvider,
    sessionRepositoryProvider,
    articleRepositoryProvider,
    bookmarkRepositoryProvider,
    commentRepositoryProvider,
  ],
  exports: [PrivacyService],
})
export class PrivacyModule {}
