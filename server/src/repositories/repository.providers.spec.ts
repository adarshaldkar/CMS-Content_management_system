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
import { SeamlessArticleRepository } from './seamless/seamless-article.repository';
import { SeamlessUserRepository } from './seamless/seamless-user.repository';
import { SeamlessCategoryRepository } from './seamless/seamless-category.repository';

describe('Repository Providers (Dual Database Switching Logic)', () => {
  const mockPostgresArticleRepo = {} as PostgresArticleRepository;
  const mockMongoArticleRepo = {} as MongoArticleRepository;

  const mockPostgresCategoryRepo = {} as PostgresCategoryRepository;
  const mockMongoCategoryRepo = {} as MongoCategoryRepository;

  const mockPostgresUserRepo = {} as PostgresUserRepository;
  const mockMongoUserRepo = {} as MongoUserRepository;

  describe('articleRepositoryProvider', () => {
    it('should inject SeamlessArticleRepository wrapping Postgres when ACTIVE_DATABASE is postgres', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('postgres'),
      } as unknown as ConfigService;

      const provider = articleRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresArticleRepo,
        mockMongoArticleRepo,
      ) as any;

      expect(mockConfigService.get).toHaveBeenCalledWith('ACTIVE_DATABASE', { infer: true });
      expect(provider).toBeInstanceOf(SeamlessArticleRepository);
      expect(provider.activeDbName).toBe('postgres');
      expect(provider.peerDbName).toBe('mongodb');
    });

    it('should inject SeamlessArticleRepository wrapping Mongo when ACTIVE_DATABASE is mongodb', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('mongodb'),
      } as unknown as ConfigService;

      const provider = articleRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresArticleRepo,
        mockMongoArticleRepo,
      ) as any;

      expect(mockConfigService.get).toHaveBeenCalledWith('ACTIVE_DATABASE', { infer: true });
      expect(provider).toBeInstanceOf(SeamlessArticleRepository);
      expect(provider.activeDbName).toBe('mongodb');
      expect(provider.peerDbName).toBe('postgres');
    });
  });

  describe('categoryRepositoryProvider', () => {
    it('should inject SeamlessCategoryRepository wrapping Postgres when ACTIVE_DATABASE is postgres', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('postgres'),
      } as unknown as ConfigService;

      const provider = categoryRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresCategoryRepo,
        mockMongoCategoryRepo,
      ) as any;

      expect(provider).toBeInstanceOf(SeamlessCategoryRepository);
      expect(provider.activeDbName).toBe('postgres');
      expect(provider.peerDbName).toBe('mongodb');
    });

    it('should inject SeamlessCategoryRepository wrapping Mongo when ACTIVE_DATABASE is mongodb', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('mongodb'),
      } as unknown as ConfigService;

      const provider = categoryRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresCategoryRepo,
        mockMongoCategoryRepo,
      ) as any;

      expect(provider).toBeInstanceOf(SeamlessCategoryRepository);
      expect(provider.activeDbName).toBe('mongodb');
      expect(provider.peerDbName).toBe('postgres');
    });
  });

  describe('userRepositoryProvider', () => {
    it('should inject SeamlessUserRepository wrapping Postgres when ACTIVE_DATABASE is postgres', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('postgres'),
      } as unknown as ConfigService;

      const provider = userRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresUserRepo,
        mockMongoUserRepo,
      ) as any;

      expect(provider).toBeInstanceOf(SeamlessUserRepository);
      expect(provider.activeDbName).toBe('postgres');
      expect(provider.peerDbName).toBe('mongodb');
    });

    it('should inject SeamlessUserRepository wrapping Mongo when ACTIVE_DATABASE is mongodb', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue('mongodb'),
      } as unknown as ConfigService;

      const provider = userRepositoryProvider.useFactory(
        mockConfigService as any,
        mockPostgresUserRepo,
        mockMongoUserRepo,
      ) as any;

      expect(provider).toBeInstanceOf(SeamlessUserRepository);
      expect(provider.activeDbName).toBe('mongodb');
      expect(provider.peerDbName).toBe('postgres');
    });
  });
});
