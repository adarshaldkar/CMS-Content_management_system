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
import { PostgresArticleRepository } from './postgres/postgres-article.repository';
import { MongoArticleRepository } from './mongo/mongo-article.repository';
import { PostgresCategoryRepository } from './postgres/postgres-category.repository';
import { MongoCategoryRepository } from './mongo/mongo-category.repository';
import { PostgresUserRepository } from './postgres/postgres-user.repository';
import { MongoUserRepository } from './mongo/mongo-user.repository';
import { PostgresSessionRepository } from './postgres/postgres-session.repository';
import { MongoSessionRepository } from './mongo/mongo-session.repository';
import { PostgresAuditLogRepository } from './postgres/postgres-audit-log.repository';
import { MongoAuditLogRepository } from './mongo/mongo-audit-log.repository';
import { PostgresRevisionRepository } from './postgres/postgres-revision.repository';
import { MongoRevisionRepository } from './mongo/mongo-revision.repository';
import { PostgresMediaRepository } from './postgres/postgres-media.repository';
import { MongoMediaRepository } from './mongo/mongo-media.repository';
import { SeamlessUserRepository } from './seamless/seamless-user.repository';
import { SeamlessArticleRepository } from './seamless/seamless-article.repository';

export const articleRepositoryProvider: FactoryProvider<IArticleRepository> = {
  provide: ARTICLE_REPOSITORY,
  inject: [ConfigService, PostgresArticleRepository, MongoArticleRepository],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresArticleRepository,
    mongoRepo: MongoArticleRepository,
  ): IArticleRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    return active === 'mongodb'
      ? new SeamlessArticleRepository(mongoRepo, postgresRepo, 'mongodb', 'postgres')
      : new SeamlessArticleRepository(postgresRepo, mongoRepo, 'postgres', 'mongodb');
  },
};

export const userRepositoryProvider: FactoryProvider<IUserRepository> = {
  provide: USER_REPOSITORY,
  inject: [ConfigService, PostgresUserRepository, MongoUserRepository],
  useFactory: (
    config: ConfigService<EnvConfig, true>,
    postgresRepo: PostgresUserRepository,
    mongoRepo: MongoUserRepository,
  ): IUserRepository => {
    const active = config.get('ACTIVE_DATABASE', { infer: true });
    return active === 'mongodb'
      ? new SeamlessUserRepository(mongoRepo, postgresRepo, 'mongodb', 'postgres')
      : new SeamlessUserRepository(postgresRepo, mongoRepo, 'postgres', 'mongodb');
  },
};

import { SeamlessCategoryRepository } from './seamless/seamless-category.repository';
import { SeamlessMediaRepository } from './seamless/seamless-media.repository';
import { SeamlessRevisionRepository } from './seamless/seamless-revision.repository';

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
