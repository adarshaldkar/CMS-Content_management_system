import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.schema';
import {
  ARTICLE_REPOSITORY,
  type IArticleRepository,
} from './interfaces/article.repository.interface';
import {
  CATEGORY_REPOSITORY,
  type ICategoryRepository,
} from './interfaces/category.repository.interface';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from './interfaces/user.repository.interface';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from './interfaces/session.repository.interface';
import {
  AUDIT_LOG_REPOSITORY,
  type IAuditLogRepository,
} from './interfaces/audit-log.repository.interface';
import {
  REVISION_REPOSITORY,
  type IRevisionRepository,
} from './interfaces/revision.repository.interface';
import {
  MEDIA_REPOSITORY,
  type IMediaRepository,
} from './interfaces/media.repository.interface';
import {
  BOOKMARK_REPOSITORY,
  type IBookmarkRepository,
} from './interfaces/bookmark.repository.interface';
import {
  LIKE_REPOSITORY,
  type ILikeRepository,
} from './interfaces/like.repository.interface';
import {
  FOLLOW_REPOSITORY,
  type IFollowRepository,
} from './interfaces/follow.repository.interface';

// PostgreSQL Repositories
import { PostgresArticleRepository } from './postgres/postgres-article.repository';
import { PostgresCategoryRepository } from './postgres/postgres-category.repository';
import { PostgresUserRepository } from './postgres/postgres-user.repository';
import { PostgresSessionRepository } from './postgres/postgres-session.repository';
import { PostgresAuditLogRepository } from './postgres/postgres-audit-log.repository';
import { PostgresRevisionRepository } from './postgres/postgres-revision.repository';
import { PostgresMediaRepository } from './postgres/postgres-media.repository';
import { PostgresBookmarkRepository } from './postgres/postgres-bookmark.repository';
import { PostgresLikeRepository } from './postgres/postgres-like.repository';
import { PostgresFollowRepository } from './postgres/postgres-follow.repository';

// MongoDB Repositories
import { MongoArticleRepository } from './mongo/mongo-article.repository';
import { MongoCategoryRepository } from './mongo/mongo-category.repository';
import { MongoUserRepository } from './mongo/mongo-user.repository';
import { MongoSessionRepository } from './mongo/mongo-session.repository';
import { MongoAuditLogRepository } from './mongo/mongo-audit-log.repository';
import { MongoRevisionRepository } from './mongo/mongo-revision.repository';
import { MongoMediaRepository } from './mongo/mongo-media.repository';

// MariaDB Repositories
import { MariaDbUserRepository } from './mariadb/mariadb-user.repository';
import { MariaDbArticleRepository } from './mariadb/mariadb-article.repository';
import { MariaDbCategoryRepository } from './mariadb/mariadb-category.repository';
import { MariaDbCommentRepository } from './mariadb/mariadb-comment.repository';
import { MariaDbBookmarkRepository } from './mariadb/mariadb-bookmark.repository';
import { MariaDbLikeRepository } from './mariadb/mariadb-like.repository';
import { MariaDbFollowRepository } from './mariadb/mariadb-follow.repository';
import { MariaDbMediaRepository } from './mariadb/mariadb-media.repository';
import { MariaDbRevisionRepository } from './mariadb/mariadb-revision.repository';
import { MariaDbAuditLogRepository } from './mariadb/mariadb-audit-log.repository';

// MySQL Repositories
import { MySqlUserRepository } from './mysql/mysql-user.repository';
import { MySqlArticleRepository } from './mysql/mysql-article.repository';
import { MySqlCategoryRepository } from './mysql/mysql-category.repository';
import { MySqlCommentRepository } from './mysql/mysql-comment.repository';
import { MySqlBookmarkRepository } from './mysql/mysql-bookmark.repository';
import { MySqlLikeRepository } from './mysql/mysql-like.repository';
import { MySqlFollowRepository } from './mysql/mysql-follow.repository';
import { MySqlMediaRepository } from './mysql/mysql-media.repository';
import { MySqlRevisionRepository } from './mysql/mysql-revision.repository';
import { MySqlAuditLogRepository } from './mysql/mysql-audit-log.repository';

// CockroachDB Repositories
import { CockroachUserRepository } from './cockroach/cockroach-user.repository';
import { CockroachArticleRepository } from './cockroach/cockroach-article.repository';
import { CockroachCategoryRepository } from './cockroach/cockroach-category.repository';
import { CockroachCommentRepository } from './cockroach/cockroach-comment.repository';
import { CockroachBookmarkRepository } from './cockroach/cockroach-bookmark.repository';
import { CockroachLikeRepository } from './cockroach/cockroach-like.repository';
import { CockroachFollowRepository } from './cockroach/cockroach-follow.repository';
import { CockroachMediaRepository } from './cockroach/cockroach-media.repository';
import { CockroachRevisionRepository } from './cockroach/cockroach-revision.repository';
import { CockroachAuditLogRepository } from './cockroach/cockroach-audit-log.repository';

// ClickHouse Repositories
import { ClickHouseArticleRepository } from './clickhouse/clickhouse-article.repository';
import { ClickHouseUserRepository } from './clickhouse/clickhouse-user.repository';
import { ClickHouseAuditLogRepository } from './clickhouse/clickhouse-audit-log.repository';

// Services
import { MariaDbService } from '../database/mariadb.service';
import { MySqlService } from '../database/mysql.service';
import { CockroachDbService } from '../database/cockroach.service';
import { ClickHouseService } from '../database/clickhouse.service';

// Seamless Active-Active Coordinators
import { SeamlessUserRepository } from './seamless/seamless-user.repository';
import { SeamlessArticleRepository } from './seamless/seamless-article.repository';
import { SeamlessCategoryRepository } from './seamless/seamless-category.repository';
import { SeamlessMediaRepository } from './seamless/seamless-media.repository';
import { SeamlessRevisionRepository } from './seamless/seamless-revision.repository';

export const articleRepositoryProvider: FactoryProvider<IArticleRepository> = {
  provide: ARTICLE_REPOSITORY,
  inject: [
    ConfigService,
    PostgresArticleRepository,
    MongoArticleRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    ClickHouseService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresArticleRepository,
    mongoRepo: MongoArticleRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    clickhouse: ClickHouseService,
  ): IArticleRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    return active === 'mongodb'
      ? new SeamlessArticleRepository(mongoRepo, postgresRepo, 'mongodb', 'postgres', mariadb, mysql, cockroach, clickhouse)
      : new SeamlessArticleRepository(postgresRepo, mongoRepo, 'postgres', 'mongodb', mariadb, mysql, cockroach, clickhouse);
  },
};

export const userRepositoryProvider: FactoryProvider<IUserRepository> = {
  provide: USER_REPOSITORY,
  inject: [
    ConfigService,
    PostgresUserRepository,
    MongoUserRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    ClickHouseService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresUserRepository,
    mongoRepo: MongoUserRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    clickhouse: ClickHouseService,
  ): IUserRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    return active === 'mongodb'
      ? new SeamlessUserRepository(mongoRepo, postgresRepo, 'mongodb', 'postgres', mariadb, mysql, cockroach, clickhouse)
      : new SeamlessUserRepository(postgresRepo, mongoRepo, 'postgres', 'mongodb', mariadb, mysql, cockroach, clickhouse);
  },
};

export const categoryRepositoryProvider: FactoryProvider<ICategoryRepository> = {
  provide: CATEGORY_REPOSITORY,
  inject: [ConfigService, PostgresCategoryRepository, MongoCategoryRepository],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresCategoryRepository,
    mongoRepo: MongoCategoryRepository,
  ): ICategoryRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    return active === 'mongodb'
      ? new SeamlessCategoryRepository(mongoRepo, postgresRepo, 'mongodb', 'postgres')
      : new SeamlessCategoryRepository(postgresRepo, mongoRepo, 'postgres', 'mongodb');
  },
};

export const sessionRepositoryProvider: FactoryProvider<ISessionRepository> = {
  provide: SESSION_REPOSITORY,
  inject: [ConfigService, PostgresSessionRepository, MongoSessionRepository],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresSessionRepository,
    mongoRepo: MongoSessionRepository,
  ): ISessionRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    return active === 'mongodb' ? mongoRepo : postgresRepo;
  },
};

export const auditLogRepositoryProvider: FactoryProvider<IAuditLogRepository> = {
  provide: AUDIT_LOG_REPOSITORY,
  inject: [ConfigService, PostgresAuditLogRepository, MongoAuditLogRepository],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresAuditLogRepository,
    mongoRepo: MongoAuditLogRepository,
  ): IAuditLogRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    return active === 'mongodb' ? mongoRepo : postgresRepo;
  },
};

export const revisionRepositoryProvider: FactoryProvider<IRevisionRepository> = {
  provide: REVISION_REPOSITORY,
  inject: [ConfigService, PostgresRevisionRepository, MongoRevisionRepository],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresRevisionRepository,
    mongoRepo: MongoRevisionRepository,
  ): IRevisionRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    return active === 'mongodb'
      ? new SeamlessRevisionRepository(mongoRepo, postgresRepo, 'mongodb', 'postgres')
      : new SeamlessRevisionRepository(postgresRepo, mongoRepo, 'postgres', 'mongodb');
  },
};

export const mediaRepositoryProvider: FactoryProvider<IMediaRepository> = {
  provide: MEDIA_REPOSITORY,
  inject: [ConfigService, PostgresMediaRepository, MongoMediaRepository],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresMediaRepository,
    mongoRepo: MongoMediaRepository,
  ): IMediaRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    return active === 'mongodb'
      ? new SeamlessMediaRepository(mongoRepo, postgresRepo, 'mongodb', 'postgres')
      : new SeamlessMediaRepository(postgresRepo, mongoRepo, 'postgres', 'mongodb');
  },
};

export const bookmarkRepositoryProvider: FactoryProvider<IBookmarkRepository> = {
  provide: BOOKMARK_REPOSITORY,
  inject: [ConfigService, PostgresBookmarkRepository],
  useFactory: (_config: ConfigService<EnvConfig, true>, postgresRepo: PostgresBookmarkRepository): IBookmarkRepository => {
    return postgresRepo;
  },
};

export const likeRepositoryProvider: FactoryProvider<ILikeRepository> = {
  provide: LIKE_REPOSITORY,
  inject: [ConfigService, PostgresLikeRepository],
  useFactory: (_config: ConfigService<EnvConfig, true>, postgresRepo: PostgresLikeRepository): ILikeRepository => {
    return postgresRepo;
  },
};

export const followRepositoryProvider: FactoryProvider<IFollowRepository> = {
  provide: FOLLOW_REPOSITORY,
  inject: [ConfigService, PostgresFollowRepository],
  useFactory: (_config: ConfigService<EnvConfig, true>, postgresRepo: PostgresFollowRepository): IFollowRepository => {
    return postgresRepo;
  },
};

export const ALL_DATABASE_REPOSITORIES = [
  // PostgreSQL
  PostgresUserRepository,
  PostgresArticleRepository,
  PostgresCategoryRepository,
  PostgresBookmarkRepository,
  PostgresLikeRepository,
  PostgresFollowRepository,
  PostgresMediaRepository,
  PostgresRevisionRepository,
  PostgresSessionRepository,
  PostgresAuditLogRepository,

  // MongoDB
  MongoUserRepository,
  MongoArticleRepository,
  MongoCategoryRepository,
  MongoMediaRepository,
  MongoRevisionRepository,
  MongoSessionRepository,
  MongoAuditLogRepository,

  // MariaDB
  MariaDbUserRepository,
  MariaDbArticleRepository,
  MariaDbCategoryRepository,
  MariaDbCommentRepository,
  MariaDbBookmarkRepository,
  MariaDbLikeRepository,
  MariaDbFollowRepository,
  MariaDbMediaRepository,
  MariaDbRevisionRepository,
  MariaDbAuditLogRepository,

  // MySQL
  MySqlUserRepository,
  MySqlArticleRepository,
  MySqlCategoryRepository,
  MySqlCommentRepository,
  MySqlBookmarkRepository,
  MySqlLikeRepository,
  MySqlFollowRepository,
  MySqlMediaRepository,
  MySqlRevisionRepository,
  MySqlAuditLogRepository,

  // CockroachDB
  CockroachUserRepository,
  CockroachArticleRepository,
  CockroachCategoryRepository,
  CockroachCommentRepository,
  CockroachBookmarkRepository,
  CockroachLikeRepository,
  CockroachFollowRepository,
  CockroachMediaRepository,
  CockroachRevisionRepository,
  CockroachAuditLogRepository,

  // ClickHouse
  ClickHouseUserRepository,
  ClickHouseArticleRepository,
  ClickHouseAuditLogRepository,
];
