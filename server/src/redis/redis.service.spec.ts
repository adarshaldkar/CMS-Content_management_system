import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      status: 'ready',
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(105),
      eval: jest.fn().mockResolvedValue(1),
      publish: jest.fn().mockResolvedValue(1),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn((event, cb) => {
        if (event === 'connect') cb();
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, def) => {
              const map: Record<string, any> = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: 'cms_dev_password',
                REDIS_DB: 0,
              };
              return map[key] ?? def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    // Inject mock client for unit testing
    (service as any).client = mockRedisClient;
    (service as any).isAvailable = true;
  });

  it('should be defined and report healthy', () => {
    expect(service).toBeDefined();
    expect(service.isHealthy()).toBe(true);
  });

  describe('Version-Aware L2 Caching', () => {
    it('should store and retrieve cached envelope with version metadata', async () => {
      const payload = { id: 'art-1', title: 'Redis Architecture' };
      const envelope = {
        entityVersion: 3,
        activeEngine: 'postgres',
        cachedAt: new Date().toISOString(),
        payload,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(envelope));

      const result = await service.getCached<typeof payload>('cms:v1:cache:test');
      expect(result).not.toBeNull();
      expect(result?.payload.title).toBe('Redis Architecture');
      expect(result?.entityVersion).toBe(3);
    });

    it('should discard stale cache if age exceeds hard staleness ceiling (> 300s)', async () => {
      const oldDate = new Date(Date.now() - 400 * 1000).toISOString(); // 400s old
      const envelope = {
        entityVersion: 1,
        cachedAt: oldDate,
        payload: { stale: true },
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(envelope));

      const result = await service.getCached('cms:v1:cache:stale');
      expect(result).toBeNull();
    });

    it('should delete keys on invalidation', async () => {
      await service.delCached('key-1', 'key-2');
      expect(mockRedisClient.del).toHaveBeenCalledWith('key-1', 'key-2');
    });
  });

  describe('Single-Flight Process-Local Request Coalescing', () => {
    it('should coalesce simultaneous requests so fetcher executes only once', async () => {
      const fetcher = jest.fn().mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 20));
        return { data: 'coalesced-response' };
      });

      const [res1, res2, res3] = await Promise.all([
        service.coalesce('flight-key', fetcher),
        service.coalesce('flight-key', fetcher),
        service.coalesce('flight-key', fetcher),
      ]);

      expect(res1).toEqual({ data: 'coalesced-response' });
      expect(res2).toEqual({ data: 'coalesced-response' });
      expect(res3).toEqual({ data: 'coalesced-response' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fencing Token Distributed Mutex', () => {
    it('should acquire fencing token lock when Redis key is available', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.incr.mockResolvedValue(105);

      const result = await service.acquireFencingLock('db_switch', 10000);
      expect(result).not.toBeNull();
      expect(result?.fencingToken).toBe(105);
      expect(result?.lockId).toContain('lock-owner-');
    });

    it('should return null when lock is held by another process', async () => {
      mockRedisClient.set.mockResolvedValue(null);

      const result = await service.acquireFencingLock('db_switch', 10000);
      expect(result).toBeNull();
    });

    it('should release fencing lock via Lua script verification', async () => {
      mockRedisClient.eval.mockResolvedValue(1);

      const released = await service.releaseFencingLock('db_switch', 'owner-123');
      expect(released).toBe(true);
      expect(mockRedisClient.eval).toHaveBeenCalled();
    });
  });

  describe('User-Bound Idempotency', () => {
    it('should acquire lock for first-time mutation', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');

      const check = await service.checkAndSetIdempotency('user-1', 'LIKE', 'key-abc');
      expect(check.status).toBe('ACQUIRED');
    });

    it('should return PENDING for in-flight requests', async () => {
      mockRedisClient.get.mockResolvedValue('PENDING');

      const check = await service.checkAndSetIdempotency('user-1', 'LIKE', 'key-abc');
      expect(check.status).toBe('PENDING');
    });

    it('should return COMPLETED with cached result for replayed requests', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({ liked: true }));

      const check = await service.checkAndSetIdempotency('user-1', 'LIKE', 'key-abc');
      expect(check.status).toBe('COMPLETED');
      expect(check.result).toEqual({ liked: true });
    });
  });
});
