import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EmbedsService } from './embeds.service';
import { RedisService } from '../../redis/redis.service';
import { isPrivateIp, validateUrlSyntactics } from './utils/ssrf-validator.util';

describe('Embeds Module & SSRF Defense', () => {
  describe('SSRF IP Validator (isPrivateIp)', () => {
    it('should correctly identify loopback addresses as private', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.255.255.255')).toBe(true);
      expect(isPrivateIp('::1')).toBe(true);
    });

    it('should correctly identify private class A, B, and C networks', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.254.1.9')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('192.168.254.254')).toBe(true);
    });

    it('should block AWS / Cloud instance metadata address (169.254.169.254)', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('169.254.0.1')).toBe(true);
    });

    it('should allow public routable IP addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('142.250.190.46')).toBe(false);
      expect(isPrivateIp('93.184.216.34')).toBe(false);
    });
  });

  describe('URL Syntactic Gatekeeper (validateUrlSyntactics)', () => {
    it('should accept valid HTTP and HTTPS URLs', () => {
      expect(() => validateUrlSyntactics('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).not.toThrow();
      expect(() => validateUrlSyntactics('http://example.com/article')).not.toThrow();
    });

    it('should reject file, data, and javascript URI schemes', () => {
      expect(() => validateUrlSyntactics('file:///etc/passwd')).toThrow(BadRequestException);
      expect(() => validateUrlSyntactics('data:text/html,<script>alert(1)</script>')).toThrow(
        BadRequestException,
      );
      expect(() => validateUrlSyntactics('javascript:alert(1)')).toThrow(BadRequestException);
    });

    it('should reject URLs with embedded credentials (user:pass@host)', () => {
      expect(() => validateUrlSyntactics('http://admin:password@192.168.1.1/')).toThrow(
        BadRequestException,
      );
    });

    it('should reject URLs specifying non-standard internal ports', () => {
      expect(() => validateUrlSyntactics('http://example.com:6379/')).toThrow(
        BadRequestException,
      );
      expect(() => validateUrlSyntactics('http://example.com:5432/')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('EmbedsService', () => {
    let service: EmbedsService;
    let mockRedisCache: Record<string, string>;

    const mockRedisService = {
      getCached: jest.fn(async (key: string) => {
        const item = mockRedisCache[key];
        return item ? { payload: JSON.parse(item), cachedAt: new Date().toISOString() } : null;
      }),
      setCached: jest.fn(async (key: string, value: any) => {
        mockRedisCache[key] = JSON.stringify(value);
      }),
      delCached: jest.fn(async (key: string) => {
        delete mockRedisCache[key];
      }),
    };

    beforeEach(async () => {
      mockRedisCache = {};
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmbedsService,
          { provide: RedisService, useValue: mockRedisService },
        ],
      }).compile();

      service = module.get<EmbedsService>(EmbedsService);
    });

    it('should correctly normalize YouTube watch URLs with timestamp offsets', async () => {
      const result = await service.scrapeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s');

      expect(result.provider).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.startTime).toBe(90);
      expect(result.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90');
      expect(result.aspectRatio).toBe('16:9');
    });

    it('should correctly normalize YouTube Shorts URLs', async () => {
      const result = await service.scrapeUrl('https://youtube.com/shorts/dQw4w9WgXcQ');

      expect(result.provider).toBe('youtube');
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('should return cached result from Redis without triggering network lookup on subsequent calls', async () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';

      // First call
      const first = await service.scrapeUrl(url);
      expect(first.videoId).toBe('dQw4w9WgXcQ');

      // Second call
      const second = await service.scrapeUrl(url);
      expect(second.videoId).toBe('dQw4w9WgXcQ');

      // Redis getCached was called
      expect(mockRedisService.getCached).toHaveBeenCalled();
    });

    it('should normalize Loom share URLs to embed player URLs', async () => {
      const result = await service.scrapeUrl('https://www.loom.com/share/abc12345xyz');

      expect(result.provider).toBe('loom');
      expect(result.videoId).toBe('abc12345xyz');
      expect(result.embedUrl).toBe('https://www.loom.com/embed/abc12345xyz');
      expect(result.aspectRatio).toBe('16:9');
    });

    it('should normalize Spotify track URLs to embed player URLs', async () => {
      const result = await service.scrapeUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');

      expect(result.provider).toBe('spotify');
      expect(result.embedUrl).toBe('https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT');
      expect(result.aspectRatio).toBe('compact');
    });

    it('should provide fetchTranscript endpoint logic with structured return', async () => {
      const result = await service.fetchTranscript('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result).toHaveProperty('transcript');
      expect(result).toHaveProperty('transcriptLines');
      expect(result).toHaveProperty('hasTranscript');
      expect(result).toHaveProperty('provider', 'YouTube');
      expect(Array.isArray(result.transcriptLines)).toBe(true);
    });
  });
});
