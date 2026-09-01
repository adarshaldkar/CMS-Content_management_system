import { ConfigService } from '@nestjs/config';
import {
  articleRepositoryProvider,
  categoryRepositoryProvider,
  userRepositoryProvider,
} from './repository.providers';
import { PostgresArticleRepository } from './postgres/postgres-article.repository';
import { MongoArticleRepository } from './mongo/mongo-article.repository';
import { PostgresCategoryRepository } from './postgres/postgres-category.repository';
import { MongoCategoryRepository } from './mongo/mongo-category.repository';
import { PostgresUserRepository } from './postgres/postgres-user.repository';
import { MongoUserRepository } from './mongo/mongo-user.repository';
import { MariaDbArticleRepository } from './mariadb/mariadb-article.repository';
import { MariaDbCategoryRepository } from './mariadb/mariadb-category.repository';
import { MariaDbUserRepository } from './mariadb/mariadb-user.repository';
import { SeamlessArticleRepository } from './seamless/seamless-article.repository';
import { SeamlessUserRepository } from './seamless/seamless-user.repository';
import { SeamlessCategoryRepository } from './seamless/seamless-category.repository';

describe('Repository Providers (Dual Database Switching Logic)', () => {
  const originalActiveDb = process.env.ACTIVE_DATABASE;

  afterEach(() => {
    if (originalActiveDb === undefined) {
      delete process.env.ACTIVE_DATABASE;
    } else {
      process.env.ACTIVE_DATABASE = originalActiveDb;
    }
  });

  const mockPostgresArticleRepo = {} as PostgresArticleRepository;
  const mockMongoArticleRepo = {} as MongoArticleRepository;

  const mockPostgresCategoryRepo = {} as PostgresCategoryRepository;
  const mockMongoCategoryRepo = {} as MongoCategoryRepository;

  const mockPostgresUserRepo = {} as PostgresUserRepository;
  const mockMongoUserRepo = {} as MongoUserRepository;

  const createMockRegistry = () => ({
    setInitialActive: jest.fn(),
    register: jest.fn(),
    switchAllTo: jest.fn(),
  });

  describe('articleRepositoryProvider', () => {
    it('should inject SeamlessArticleRepository wrapping Postgres when ACTIVE_DATABASE is postgres', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('postgres'),
      } as unknown as ConfigService;
      const registry = createMockRegistry();

      const provider = articleRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresArticleRepo,
        mockMongoArticleRepo,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        registry,
      ) as any;

      expect(mockConfigService.get).toHaveBeenCalledWith('ACTIVE_DATABASE', { infer: true });
      expect(provider).toBeInstanceOf(SeamlessArticleRepository);
      expect(provider.activeDbName).toBe('postgres');
      expect(provider.peerDbName).toBe('mongodb');
      expect(registry.setInitialActive).toHaveBeenCalledWith('postgres');
      expect(registry.register).toHaveBeenCalledWith(provider);
    });

    it('should inject SeamlessArticleRepository wrapping Mongo when ACTIVE_DATABASE is mongodb', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('mongodb'),
      } as unknown as ConfigService;
      const registry = createMockRegistry();

      const provider = articleRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresArticleRepo,
        mockMongoArticleRepo,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        registry,
      ) as any;

      expect(mockConfigService.get).toHaveBeenCalledWith('ACTIVE_DATABASE', { infer: true });
      expect(provider).toBeInstanceOf(SeamlessArticleRepository);
      expect(provider.activeDbName).toBe('mongodb');
      expect(provider.peerDbName).toBe('postgres');
      expect(registry.setInitialActive).toHaveBeenCalledWith('mongodb');
      expect(registry.register).toHaveBeenCalledWith(provider);
    });

    it('should route reads through the per-engine repository when a SQL engine is active', () => {
      process.env.ACTIVE_DATABASE = 'mariadb';
      const mockConfigService = {
        get: jest.fn().mockReturnValue('postgres'),
      } as unknown as ConfigService;
      const registry = createMockRegistry();
      const mariadbService = {} as any;
      const mysqlService = {} as any;
      const cockroachService = {} as any;

      const provider = articleRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresArticleRepo,
        mockMongoArticleRepo,
        mariadbService,
        mysqlService,
        cockroachService,
        {} as any,
        registry,
      ) as any;

      expect(provider['activeRepo']).toBeInstanceOf(MariaDbArticleRepository);
    });
  });

  describe('categoryRepositoryProvider', () => {
    it('should inject SeamlessCategoryRepository wrapping Postgres when ACTIVE_DATABASE is postgres', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('postgres'),
      } as unknown as ConfigService;
      const registry = createMockRegistry();

      const provider = categoryRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresCategoryRepo,
        mockMongoCategoryRepo,
        {} as any,
        {} as any,
        {} as any,
        registry,
      ) as any;

      expect(provider).toBeInstanceOf(SeamlessCategoryRepository);
      expect(provider.activeDbName).toBe('postgres');
      expect(provider.peerDbName).toBe('mongodb');
      expect(registry.register).toHaveBeenCalledWith(provider);
    });

    it('should inject SeamlessCategoryRepository wrapping Mongo when ACTIVE_DATABASE is mongodb', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('mongodb'),
      } as unknown as ConfigService;
      const registry = createMockRegistry();

      const provider = categoryRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresCategoryRepo,
        mockMongoCategoryRepo,
        {} as any,
        {} as any,
        {} as any,
        registry,
      ) as any;

      expect(provider).toBeInstanceOf(SeamlessCategoryRepository);
      expect(provider.activeDbName).toBe('mongodb');
      expect(provider.peerDbName).toBe('postgres');
      expect(registry.register).toHaveBeenCalledWith(provider);
    });

    it('should route reads through the per-engine repository for category', () => {
      process.env.ACTIVE_DATABASE = 'mariadb';
      const mockConfigService = {
        get: jest.fn().mockReturnValue('postgres'),
      } as unknown as ConfigService;
      const registry = createMockRegistry();

      const provider = categoryRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresCategoryRepo,
        mockMongoCategoryRepo,
        {} as any,
        {} as any,
        {} as any,
        registry,
      ) as any;

      expect(provider['activeRepo']).toBeInstanceOf(MariaDbCategoryRepository);
    });
  });

  describe('userRepositoryProvider', () => {
    it('should inject SeamlessUserRepository wrapping Postgres when ACTIVE_DATABASE is postgres', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('postgres'),
      } as unknown as ConfigService;
      const registry = createMockRegistry();

      const provider = userRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresUserRepo,
        mockMongoUserRepo,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        registry,
      ) as any;

      expect(provider).toBeInstanceOf(SeamlessUserRepository);
      expect(provider.activeDbName).toBe('postgres');
      expect(provider.peerDbName).toBe('mongodb');
      expect(registry.register).toHaveBeenCalledWith(provider);
    });

    it('should inject SeamlessUserRepository wrapping Mongo when ACTIVE_DATABASE is mongodb', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('mongodb'),
      } as unknown as ConfigService;
      const registry = createMockRegistry();

      const provider = userRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresUserRepo,
        mockMongoUserRepo,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        registry,
      ) as any;

      expect(provider).toBeInstanceOf(SeamlessUserRepository);
      expect(provider.activeDbName).toBe('mongodb');
      expect(provider.peerDbName).toBe('postgres');
      expect(registry.register).toHaveBeenCalledWith(provider);
    });

    it('should route reads through the per-engine repository for user', () => {
      process.env.ACTIVE_DATABASE = 'mariadb';
      const mockConfigService = {
        get: jest.fn().mockReturnValue('postgres'),
      } as unknown as ConfigService;
      const registry = createMockRegistry();

      const provider = userRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresUserRepo,
        mockMongoUserRepo,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        registry,
      ) as any;

      expect(provider['activeRepo']).toBeInstanceOf(MariaDbUserRepository);
    });
  });
});