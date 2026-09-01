import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard (Multi-Layer CSRF Defense)', () => {
  let guard: CsrfGuard;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:5173'),
  } as unknown as ConfigService<any, true>;

  beforeEach(() => {
    guard = new CsrfGuard(mockConfigService);
  });

  function createMockContext(
    method: string,
    headers: Record<string, string> = {},
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow safe HTTP read methods without custom headers (GET, HEAD, OPTIONS)', () => {
    const context = createMockContext('GET');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow mutating request (POST) when valid X-Requested-With header is present', () => {
    const context = createMockContext('POST', {
      'x-requested-with': 'XMLHttpRequest',
      origin: 'http://localhost:5173',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException on mutating request missing X-Requested-With header', () => {
    const context = createMockContext('POST', {
      origin: 'http://localhost:5173',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException on mutating request from untrusted origin', () => {
    const context = createMockContext('POST', {
      'x-requested-with': 'XMLHttpRequest',
      origin: 'http://malicious-attacker.com',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
