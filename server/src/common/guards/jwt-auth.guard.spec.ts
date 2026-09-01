import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';
import { USER_REPOSITORY } from '../../repositories/interfaces/user.repository.interface';
import { UserRole } from '../../domain/models';

describe('JwtAuthGuard', () => {
  const user = {
    id: 'u1',
    email: 'user@example.com',
    name: 'User',
    bio: null,
    avatarUrl: null,
    preferredTopics: [],
    role: UserRole.AUTHOR,
    isActive: true,
  };

  function buildGuard(currentUser = user) {
    const token = jwt.sign(
      {
        sub: user.id, email: user.email, name: user.name, role: user.role,
        jti: 'jti-1', type: 'access', iss: 'cms-platform', aud: 'cms-client',
      },
      'test-access-secret-0123456789-0123456789',
      { algorithm: 'HS256', expiresIn: '15m' },
    );
    const moduleRef = {
      get: jest.fn().mockImplementation((token: symbol) => {
        expect(token).toBe(USER_REPOSITORY);
        return { findById: jest.fn().mockResolvedValue(currentUser) };
      }),
    } as any;
    const config = { get: jest.fn().mockReturnValue('test-access-secret-0123456789-0123456789') } as unknown as ConfigService<any, true>;
    const guard = new JwtAuthGuard(new Reflector(), config, moduleRef);
    const request: any = { cookies: { access_token: token } };
    return { guard, context: {
      getHandler: () => ({}), getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any, request };
  }

  it('uses current server-side role and active status', async () => {
    const { guard, context, request } = buildGuard();
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user.role).toBe(UserRole.AUTHOR);
    expect(request.user.isActive).toBe(true);
  });

  it('blocks an account that is currently deactivated', async () => {
    const { guard, context } = buildGuard({ ...user, isActive: false });
    await expect(guard.canActivate(context)).rejects.toThrow('Session expired or account is inactive.');
  });
});
