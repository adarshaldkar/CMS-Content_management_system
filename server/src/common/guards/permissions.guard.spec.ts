import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { Permission, UserRole, type AuthUser } from '../../domain/models';

describe('PermissionsGuard (RBAC Capabilities)', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  function createMockContext(user?: Partial<AuthUser>): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow SUPER_ADMIN to access any protected route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      Permission.DATABASE_SWITCH,
      Permission.USER_DELETE,
    ]);

    const context = createMockContext({
      id: 'super-admin-1',
      role: UserRole.SUPER_ADMIN,
      permissions: Object.values(Permission),
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow Author when Author possesses the required capability', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      Permission.ARTICLE_CREATE,
    ]);

    const context = createMockContext({
      id: 'author-1',
      role: UserRole.AUTHOR,
      permissions: [Permission.ARTICLE_CREATE, Permission.ARTICLE_READ_PUBLISHED],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required capability', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      Permission.DATABASE_SWITCH,
    ]);

    const context = createMockContext({
      id: 'author-1',
      role: UserRole.AUTHOR,
      permissions: [Permission.ARTICLE_CREATE],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
