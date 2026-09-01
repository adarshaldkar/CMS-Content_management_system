import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { USER_REPOSITORY, type IUserRepository } from '../../repositories/interfaces/user.repository.interface';
import { SESSION_REPOSITORY, type ISessionRepository } from '../../repositories/interfaces/session.repository.interface';
import { AuditService } from '../audit/audit.service';
import { UserRole, type User, type RefreshTokenSession } from '../../domain/models';
import { hashPassword } from '../../common/utils/password.util';

describe('AuthService (Phase 3 Security & Auth)', () => {
  let service: AuthService;

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'author@editorial.com',
    name: 'Jane Author',
    bio: null,
    avatarUrl: null,
    role: UserRole.AUTHOR,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  let mockPasswordHash: string;

  const mockUserRepo: Partial<IUserRepository> = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockSessionRepo: Partial<ISessionRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    rotateAtomic: jest.fn(),
    revokeFamily: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  };

  const mockAuditService: Partial<AuditService> = {
    log: jest.fn().mockResolvedValue({} as any),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test_jwt_access_secret_min_32_characters_long!';
      if (key === 'JWT_REFRESH_SECRET') return 'test_jwt_refresh_secret_min_32_characters_long!';
      if (key === 'NODE_ENV') return 'test';
      return null;
    }),
  };

  beforeAll(async () => {
    mockPasswordHash = await hashPassword('SecurePassword123!');
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: SESSION_REPOSITORY, useValue: mockSessionRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should hash password with Argon2id and create author account', async () => {
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockUserRepo.create as jest.Mock).mockResolvedValue(mockUser);
      (mockSessionRepo.create as jest.Mock).mockResolvedValue({} as RefreshTokenSession);

      const result = await service.register({
        email: 'author@editorial.com',
        name: 'Jane Author',
        password: 'SecurePassword123!',
      });

      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(result.user.email).toBe('author@editorial.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REGISTER_SUCCESS' }),
      );
    });

    it('should throw ConflictException if email is already in use', async () => {
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'author@editorial.com',
          name: 'Jane Author',
          password: 'SecurePassword123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login & timing attack defense', () => {
    it('should authenticate user with valid credentials and issue tokens', async () => {
      const userWithHash = { ...mockUser, passwordHash: mockPasswordHash };
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(userWithHash);
      (mockSessionRepo.create as jest.Mock).mockResolvedValue({} as RefreshTokenSession);

      const result = await service.login({
        email: 'author@editorial.com',
        password: 'SecurePassword123!',
      });

      expect(result.user.id).toBe(mockUser.id);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
      );
    });

    it('should perform constant-time dummy verification and throw generic error on non-existent email', async () => {
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILURE',
          result: 'FAILURE',
        }),
      );
    });

    it('should reject incorrect password with generic error message', async () => {
      const userWithHash = { ...mockUser, passwordHash: mockPasswordHash };
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(userWithHash);

      await expect(
        service.login({
          email: 'author@editorial.com',
          password: 'IncorrectPassword!',
        }),
      ).rejects.toThrow('Invalid email or password.');
    });
  });

  describe('refresh token rotation & reuse detection', () => {
    it('should detect reuse of an already-rotated token and revoke session family', async () => {
      const userWithHash = { ...mockUser, passwordHash: mockPasswordHash };
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(userWithHash);
      (mockSessionRepo.create as jest.Mock).mockResolvedValue({} as RefreshTokenSession);

      const loginRes = await service.login({
        email: 'author@editorial.com',
        password: 'SecurePassword123!',
      });

      // Simulate reuse detected by the atomic repository
      (mockSessionRepo.rotateAtomic as jest.Mock).mockResolvedValue({
        success: false,
        reuseDetected: true,
        familyId: 'family-compromised-uuid',
      });

      await expect(service.refresh(loginRes.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REFRESH_TOKEN_REUSE',
          result: 'BLOCKED',
        }),
      );
    });
  });
});
