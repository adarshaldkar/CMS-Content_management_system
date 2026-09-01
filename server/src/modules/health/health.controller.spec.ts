import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'ACTIVE_DATABASE') return 'postgres';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: {
            isHealthy: jest.fn().mockReturnValue(true),
            getClient: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /api/health should return status ok, phase foundation, and activeDatabase postgres', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.phase).toBe('foundation');
    expect(result.environment).toBe('test');
    expect(result.activeDatabase).toBe('postgres');
    expect(result.timestamp).toBeDefined();
  });
});
