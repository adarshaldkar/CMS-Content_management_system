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
  COMMENT_REPOSITORY,
  type ICommentRepository,
} from './interfaces/comment.repository.interface';
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
import {
  PUBLISHING_SLOT_REPOSITORY,
  type IPublishingSlotRepository,
} from './interfaces/publishing-slot.repository.interface';
import {
  NOTIFICATION_REPOSITORY,
  type INotificationRepository,
} from './interfaces/notification.repository.interface';
import {
  NEWSLETTER_REPOSITORY,
  type INewsletterRepository,
} from './interfaces/newsletter.repository.interface';
import {
  CONSENT_REPOSITORY,
  type IConsentRepository,
} from './interfaces/consent.repository.interface';
import type { SupportedDbName } from './repository-proxy';

// PostgreSQL Repositories
import { PostgresArticleRepository } from './postgres/postgres-article.repository';
import { PostgresCategoryRepository } from './postgres/postgres-category.repository';
import { PostgresUserRepository } from './postgres/postgres-user.repository';
import { PostgresSessionRepository } from './postgres/postgres-session.repository';
import { PostgresAuditLogRepository } from './postgres/postgres-audit-log.repository';
import { PostgresRevisionRepository } from './postgres/postgres-revision.repository';
import { PostgresMediaRepository } from './postgres/postgres-media.repository';
import { PostgresCommentRepository } from './postgres/postgres-comment.repository';
import { PostgresBookmarkRepository } from './postgres/postgres-bookmark.repository';
import { PostgresLikeRepository } from './postgres/postgres-like.repository';
import { PostgresFollowRepository } from './postgres/postgres-follow.repository';
import { PostgresPublishingSlotRepository } from './postgres/postgres-publishing-slot.repository';
import { PostgresNotificationRepository } from './postgres/postgres-notification.repository';
import { PostgresNewsletterRepository } from './postgres/postgres-newsletter.repository';
import { PostgresConsentRepository } from './postgres/postgres-consent.repository';

// MongoDB Repositories
import { MongoArticleRepository } from './mongo/mongo-article.repository';
import { MongoCategoryRepository } from './mongo/mongo-category.repository';
import { MongoUserRepository } from './mongo/mongo-user.repository';
import { MongoSessionRepository } from './mongo/mongo-session.repository';
import { MongoAuditLogRepository } from './mongo/mongo-audit-log.repository';
import { MongoRevisionRepository } from './mongo/mongo-revision.repository';
import { MongoMediaRepository } from './mongo/mongo-media.repository';
import { MongoCommentRepository } from './mongo/mongo-comment.repository';
import { MongoBookmarkRepository } from './mongo/mongo-bookmark.repository';
import { MongoLikeRepository } from './mongo/mongo-like.repository';
import { MongoFollowRepository } from './mongo/mongo-follow.repository';
import { MongoPublishingSlotRepository } from './mongo/mongo-publishing-slot.repository';
import { MongoNotificationRepository } from './mongo/mongo-notification.repository';
import { MongoNewsletterRepository } from './mongo/mongo-newsletter.repository';
import { MongoConsentRepository } from './mongo/mongo-consent.repository';

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
import { SeamlessCommentRepository } from './seamless/seamless-comment.repository';
import { SeamlessBookmarkRepository } from './seamless/seamless-bookmark.repository';
import { SeamlessLikeRepository } from './seamless/seamless-like.repository';
import { SeamlessFollowRepository } from './seamless/seamless-follow.repository';
import { SeamlessPublishingSlotRepository } from './seamless/seamless-publishing-slot.repository';
import { SeamlessNotificationRepository } from './seamless/seamless-notification.repository';
import { SeamlessNewsletterRepository } from './seamless/seamless-newsletter.repository';
import { SeamlessConsentRepository } from './seamless/seamless-consent.repository';

// Runtime-Switchable Registry
import { RepositoryRegistryService } from './repository-registry.service';

type EngineRepoMap = {
  mariadb?: any;
  mysql?: any;
  cockroach?: any;
};

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
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresArticleRepository,
    mongoRepo: MongoArticleRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    clickhouse: ClickHouseService,
    registry: RepositoryRegistryService,
  ): IArticleRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const engineRepos: EngineRepoMap = {
      mariadb: new MariaDbArticleRepository(mariadb),
      mysql: new MySqlArticleRepository(mysql),
      cockroach: new CockroachArticleRepository(cockroach),
    };
    const seamless =
      active === 'mongodb'
        ? new SeamlessArticleRepository(
            mongoRepo,
            postgresRepo,
            'mongodb',
            'postgres',
            mariadb,
            mysql,
            cockroach,
            clickhouse,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          )
        : new SeamlessArticleRepository(
            postgresRepo,
            mongoRepo,
            'postgres',
            'mongodb',
            mariadb,
            mysql,
            cockroach,
            clickhouse,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          );
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
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
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresUserRepository,
    mongoRepo: MongoUserRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    clickhouse: ClickHouseService,
    registry: RepositoryRegistryService,
  ): IUserRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const engineRepos: EngineRepoMap = {
      mariadb: new MariaDbUserRepository(mariadb),
      mysql: new MySqlUserRepository(mysql),
      cockroach: new CockroachUserRepository(cockroach),
    };
    const seamless =
      active === 'mongodb'
        ? new SeamlessUserRepository(
            mongoRepo,
            postgresRepo,
            'mongodb',
            'postgres',
            mariadb,
            mysql,
            cockroach,
            clickhouse,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          )
        : new SeamlessUserRepository(
            postgresRepo,
            mongoRepo,
            'postgres',
            'mongodb',
            mariadb,
            mysql,
            cockroach,
            clickhouse,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          );
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const categoryRepositoryProvider: FactoryProvider<ICategoryRepository> = {
  provide: CATEGORY_REPOSITORY,
  inject: [
    ConfigService,
    PostgresCategoryRepository,
    MongoCategoryRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresCategoryRepository,
    mongoRepo: MongoCategoryRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    registry: RepositoryRegistryService,
  ): ICategoryRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const engineRepos: EngineRepoMap = {
      mariadb: new MariaDbCategoryRepository(mariadb),
      mysql: new MySqlCategoryRepository(mysql),
      cockroach: new CockroachCategoryRepository(cockroach),
    };
    const seamless =
      active === 'mongodb'
        ? new SeamlessCategoryRepository(
            mongoRepo,
            postgresRepo,
            'mongodb',
            'postgres',
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          )
        : new SeamlessCategoryRepository(
            postgresRepo,
            mongoRepo,
            'postgres',
            'mongodb',
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          );
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
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
  inject: [
    ConfigService,
    PostgresRevisionRepository,
    MongoRevisionRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresRevisionRepository,
    mongoRepo: MongoRevisionRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    registry: RepositoryRegistryService,
  ): IRevisionRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const engineRepos: EngineRepoMap = {
      mariadb: new MariaDbRevisionRepository(mariadb),
      mysql: new MySqlRevisionRepository(mysql),
      cockroach: new CockroachRevisionRepository(cockroach),
    };
    const seamless =
      active === 'mongodb'
        ? new SeamlessRevisionRepository(
            mongoRepo,
            postgresRepo,
            'mongodb',
            'postgres',
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          )
        : new SeamlessRevisionRepository(
            postgresRepo,
            mongoRepo,
            'postgres',
            'mongodb',
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          );
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const mediaRepositoryProvider: FactoryProvider<IMediaRepository> = {
  provide: MEDIA_REPOSITORY,
  inject: [
    ConfigService,
    PostgresMediaRepository,
    MongoMediaRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresMediaRepository,
    mongoRepo: MongoMediaRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    registry: RepositoryRegistryService,
  ): IMediaRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const engineRepos: EngineRepoMap = {
      mariadb: new MariaDbMediaRepository(mariadb),
      mysql: new MySqlMediaRepository(mysql),
      cockroach: new CockroachMediaRepository(cockroach),
    };
    const seamless =
      active === 'mongodb'
        ? new SeamlessMediaRepository(
            mongoRepo,
            postgresRepo,
            'mongodb',
            'postgres',
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          )
        : new SeamlessMediaRepository(
            postgresRepo,
            mongoRepo,
            'postgres',
            'mongodb',
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          );
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const commentRepositoryProvider: FactoryProvider<ICommentRepository> = {
  provide: COMMENT_REPOSITORY,
  inject: [
    ConfigService,
    PostgresCommentRepository,
    MongoCommentRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresCommentRepository,
    mongoRepo: MongoCommentRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    registry: RepositoryRegistryService,
  ): ICommentRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const engineRepos: EngineRepoMap = {
      mariadb: new MariaDbCommentRepository(mariadb),
      mysql: new MySqlCommentRepository(mysql),
      cockroach: new CockroachCommentRepository(cockroach),
    };
    const seamless =
      active === 'mongodb'
        ? new SeamlessCommentRepository(
            mongoRepo,
            postgresRepo,
            'mongodb',
            'postgres',
            mariadb,
            mysql,
            cockroach,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          )
        : new SeamlessCommentRepository(
            postgresRepo,
            mongoRepo,
            'postgres',
            'mongodb',
            mariadb,
            mysql,
            cockroach,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          );
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const bookmarkRepositoryProvider: FactoryProvider<IBookmarkRepository> = {
  provide: BOOKMARK_REPOSITORY,
  inject: [
    ConfigService,
    PostgresBookmarkRepository,
    MongoBookmarkRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresBookmarkRepository,
    mongoRepo: MongoBookmarkRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    registry: RepositoryRegistryService,
  ): IBookmarkRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const engineRepos: EngineRepoMap = {
      mariadb: new MariaDbBookmarkRepository(mariadb),
      mysql: new MySqlBookmarkRepository(mysql),
      cockroach: new CockroachBookmarkRepository(cockroach),
    };
    const seamless =
      active === 'mongodb'
        ? new SeamlessBookmarkRepository(
            mongoRepo,
            postgresRepo,
            'mongodb',
            'postgres',
            mariadb,
            mysql,
            cockroach,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          )
        : new SeamlessBookmarkRepository(
            postgresRepo,
            mongoRepo,
            'postgres',
            'mongodb',
            mariadb,
            mysql,
            cockroach,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          );
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const likeRepositoryProvider: FactoryProvider<ILikeRepository> = {
  provide: LIKE_REPOSITORY,
  inject: [
    ConfigService,
    PostgresLikeRepository,
    MongoLikeRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresLikeRepository,
    mongoRepo: MongoLikeRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    registry: RepositoryRegistryService,
  ): ILikeRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const engineRepos: EngineRepoMap = {
      mariadb: new MariaDbLikeRepository(mariadb),
      mysql: new MySqlLikeRepository(mysql),
      cockroach: new CockroachLikeRepository(cockroach),
    };
    const seamless =
      active === 'mongodb'
        ? new SeamlessLikeRepository(
            mongoRepo,
            postgresRepo,
            'mongodb',
            'postgres',
            mariadb,
            mysql,
            cockroach,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          )
        : new SeamlessLikeRepository(
            postgresRepo,
            mongoRepo,
            'postgres',
            'mongodb',
            mariadb,
            mysql,
            cockroach,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          );
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const followRepositoryProvider: FactoryProvider<IFollowRepository> = {
  provide: FOLLOW_REPOSITORY,
  inject: [
    ConfigService,
    PostgresFollowRepository,
    MongoFollowRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresFollowRepository,
    mongoRepo: MongoFollowRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    registry: RepositoryRegistryService,
  ): IFollowRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const engineRepos: EngineRepoMap = {
      mariadb: new MariaDbFollowRepository(mariadb),
      mysql: new MySqlFollowRepository(mysql),
      cockroach: new CockroachFollowRepository(cockroach),
    };
    const seamless =
      active === 'mongodb'
        ? new SeamlessFollowRepository(
            mongoRepo,
            postgresRepo,
            'mongodb',
            'postgres',
            mariadb,
            mysql,
            cockroach,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          )
        : new SeamlessFollowRepository(
            postgresRepo,
            mongoRepo,
            'postgres',
            'mongodb',
            mariadb,
            mysql,
            cockroach,
            engineRepos.mariadb,
            engineRepos.mysql,
            engineRepos.cockroach,
          );
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const publishingSlotRepositoryProvider: FactoryProvider<IPublishingSlotRepository> = {
  provide: PUBLISHING_SLOT_REPOSITORY,
  inject: [
    ConfigService,
    PostgresPublishingSlotRepository,
    MongoPublishingSlotRepository,
    MariaDbService,
    MySqlService,
    CockroachDbService,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresPublishingSlotRepository,
    mongoRepo: MongoPublishingSlotRepository,
    mariadb: MariaDbService,
    mysql: MySqlService,
    cockroach: CockroachDbService,
    registry: RepositoryRegistryService,
  ): IPublishingSlotRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    const seamless =
      active === 'mongodb'
        ? new SeamlessPublishingSlotRepository(mongoRepo, postgresRepo, 'mongodb', 'postgres', mariadb, mysql, cockroach)
        : new SeamlessPublishingSlotRepository(postgresRepo, mongoRepo, 'postgres', 'mongodb', mariadb, mysql, cockroach);
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const notificationRepositoryProvider: FactoryProvider<INotificationRepository> = {
  provide: NOTIFICATION_REPOSITORY,
  inject: [
    ConfigService,
    PostgresNotificationRepository,
    MongoNotificationRepository,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresNotificationRepository,
    mongoRepo: MongoNotificationRepository,
    registry: RepositoryRegistryService,
  ): INotificationRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true }) || 'postgres';
    const seamless = new SeamlessNotificationRepository(postgresRepo, mongoRepo, active as SupportedDbName);
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const newsletterRepositoryProvider: FactoryProvider<INewsletterRepository> = {
  provide: NEWSLETTER_REPOSITORY,
  inject: [
    ConfigService,
    PostgresNewsletterRepository,
    MongoNewsletterRepository,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresNewsletterRepository,
    mongoRepo: MongoNewsletterRepository,
    registry: RepositoryRegistryService,
  ): INewsletterRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true }) || 'postgres';
    const seamless = new SeamlessNewsletterRepository(postgresRepo, mongoRepo, active as SupportedDbName);
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
  },
};

export const consentRepositoryProvider: FactoryProvider<IConsentRepository> = {
  provide: CONSENT_REPOSITORY,
  inject: [
    ConfigService,
    PostgresConsentRepository,
    MongoConsentRepository,
    RepositoryRegistryService,
  ],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresConsentRepository,
    mongoRepo: MongoConsentRepository,
    registry: RepositoryRegistryService,
  ): IConsentRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true }) || 'postgres';
    const seamless = new SeamlessConsentRepository(postgresRepo, mongoRepo);
    registry.setInitialActive(active);
    registry.register(seamless);
    return seamless;
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
  PostgresPublishingSlotRepository,
  PostgresNotificationRepository,
  PostgresNewsletterRepository,
  PostgresConsentRepository,

  // MongoDB
  MongoUserRepository,
  MongoArticleRepository,
  MongoCategoryRepository,
  MongoMediaRepository,
  MongoRevisionRepository,
  MongoSessionRepository,
  MongoAuditLogRepository,
  MongoCommentRepository,
  MongoBookmarkRepository,
  MongoLikeRepository,
  MongoFollowRepository,
  MongoPublishingSlotRepository,
  MongoNotificationRepository,
  MongoNewsletterRepository,
  MongoConsentRepository,

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