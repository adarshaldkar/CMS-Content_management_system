import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import type { EnvConfig } from '../../config/env.schema';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../repositories/interfaces/user.repository.interface';
import {
  SESSION_REPOSITORY,
  type ISessionRepository,
} from '../../repositories/interfaces/session.repository.interface';
import { AuditService } from '../audit/audit.service';
import {
  AuditEventType,
  ROLE_PERMISSIONS,
  UserRole,
  type AuthUser,
  type JwtAccessPayload,
  type JwtRefreshPayload,
  type User,
} from '../../domain/models';
import {
  dummyVerifyPassword,
  hashPassword,
  verifyPassword,
} from '../../common/utils/password.util';
import type { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepo: ISessionRepository,
    private readonly auditService: AuditService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      preferredTopics: user.preferredTopics || [],
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] ?? [],
      isActive: user.isActive,
    };
  }

  private signAccessToken(user: User): string {
    const secret = this.config.get('JWT_ACCESS_SECRET', { infer: true });
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      jti: crypto.randomUUID(),
      type: 'access',
      iss: 'cms-platform',
      aud: 'cms-client',
    };
    return jwt.sign(payload, secret, { expiresIn: '15m', algorithm: 'HS256' });
  }

  private signRefreshToken(
    userId: string,
    sessionId: string,
    familyId: string,
  ): string {
    const secret = this.config.get('JWT_REFRESH_SECRET', { infer: true });
    const payload: JwtRefreshPayload = {
      sub: userId,
      jti: sessionId,
      familyId,
      type: 'refresh',
      iss: 'cms-platform',
      aud: 'cms-client',
    };
    return jwt.sign(payload, secret, { expiresIn: '7d', algorithm: 'HS256' });
  }

  async register(
    dto: RegisterDto,
    meta: RequestMetadata = {},
  ): Promise<AuthResult> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.userRepo.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: UserRole.AUTHOR,
      isActive: true,
    });

    const familyId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const refreshToken = this.signRefreshToken(user.id, sessionId, familyId);
    const tokenHash = this.hashToken(refreshToken);

    await this.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      familyId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    const accessToken = this.signAccessToken(user);

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.REGISTER_SUCCESS,
      resource: `User:${user.id}`,
      result: 'SUCCESS',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      user: this.toAuthUser(user),
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto, meta: RequestMetadata = {}): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(dto.email);

    // Constant-time defense against user enumeration timing attacks
    if (!user) {
      await dummyVerifyPassword(dto.password);
      await this.auditService.log({
        action: AuditEventType.LOGIN_FAILURE,
        resource: `Auth:${dto.email}`,
        result: 'FAILURE',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'User not found' },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Password hash is normalized to `passwordHash` on every repository toDomain().
    // (Postgres aliases column `password_hash` → passwordHash; Mongo schema stores passwordHash.)
    const userWithHash = user as User & { password_hash?: string };
    const storedHash: string = userWithHash.passwordHash || userWithHash.password_hash || '';
    const isValid = await verifyPassword(storedHash, dto.password);

    if (!isValid) {
      await this.auditService.log({
        actorId: user.id,
        action: AuditEventType.LOGIN_FAILURE,
        resource: `Auth:${dto.email}`,
        result: 'FAILURE',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'Invalid credentials' },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      await this.auditService.log({
        actorId: user.id,
        action: AuditEventType.ACCESS_DENIED,
        resource: `Auth:${dto.email}`,
        result: 'BLOCKED',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'Account inactive' },
      });
      throw new ForbiddenException('Your account has been deactivated.');
    }

    const familyId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const refreshToken = this.signRefreshToken(user.id, sessionId, familyId);
    const tokenHash = this.hashToken(refreshToken);

    await this.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      familyId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    const accessToken = this.signAccessToken(user);

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.LOGIN_SUCCESS,
      resource: `Auth:${user.id}`,
      result: 'SUCCESS',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      user: this.toAuthUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(
    rawRefreshToken: string,
    meta: RequestMetadata = {},
  ): Promise<AuthResult> {
    const refreshSecret = this.config.get('JWT_REFRESH_SECRET', { infer: true });

    let decoded: JwtRefreshPayload;
    try {
      decoded = jwt.verify(rawRefreshToken, refreshSecret, {
        algorithms: ['HS256'],
        issuer: 'cms-platform',
        audience: 'cms-client',
      }) as JwtRefreshPayload;
    } catch {
      throw new UnauthorizedException('Session expired or invalid refresh token.');
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type.');
    }

    const oldTokenHash = this.hashToken(rawRefreshToken);
    const newSessionId = crypto.randomUUID();
    const newRefreshToken = this.signRefreshToken(
      decoded.sub,
      newSessionId,
      decoded.familyId,
    );
    const newTokenHash = this.hashToken(newRefreshToken);

    const rotationResult = await this.sessionRepo.rotateAtomic(
      decoded.jti,
      oldTokenHash,
      {
        id: newSessionId,
        userId: decoded.sub,
        familyId: decoded.familyId,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    );

    if (rotationResult.reuseDetected) {
      await this.auditService.log({
        actorId: decoded.sub,
        action: AuditEventType.REFRESH_TOKEN_REUSE,
        resource: `SessionFamily:${decoded.familyId}`,
        result: 'BLOCKED',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          alert: 'HIGH_SEVERITY_SECURITY_ALERT',
          compromisedSession: decoded.jti,
        },
      });
      throw new UnauthorizedException(
        'Security Alert: Compromised session detected. All sessions revoked.',
      );
    }

    if (!rotationResult.success) {
      throw new UnauthorizedException('Invalid or already rotated refresh token.');
    }

    const user = await this.userRepo.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer active.');
    }

    const accessToken = this.signAccessToken(user);

    return {
      user: this.toAuthUser(user),
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(
    rawRefreshToken?: string,
    meta: RequestMetadata = {},
  ): Promise<void> {
    if (rawRefreshToken) {
      try {
        const refreshSecret = this.config.get('JWT_REFRESH_SECRET', {
          infer: true,
        });
        const decoded = jwt.verify(rawRefreshToken, refreshSecret) as JwtRefreshPayload;
        if (decoded.familyId) {
          await this.sessionRepo.revokeFamily(decoded.familyId);
          await this.auditService.log({
            actorId: decoded.sub,
            action: AuditEventType.LOGOUT,
            resource: `SessionFamily:${decoded.familyId}`,
            result: 'SUCCESS',
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
          });
        }
      } catch {
        // Safe ignore on expired token during logout
      }
    }
  }

  async logoutAll(userId: string, meta: RequestMetadata = {}): Promise<void> {
    await this.sessionRepo.revokeAllUserSessions(userId);
    await this.auditService.log({
      actorId: userId,
      action: AuditEventType.LOGOUT_ALL_SESSIONS,
      resource: `User:${userId}`,
      result: 'SUCCESS',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive.');
    }
    return this.toAuthUser(user);
  }

  async updateProfile(
    userId: string,
    dto: { name?: string; bio?: string; avatarUrl?: string; preferredTopics?: string[] },
    meta: RequestMetadata = {},
  ): Promise<AuthUser> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive.');
    }

    const updated = await this.userRepo.update(userId, {
      name: dto.name ?? user.name,
      bio: dto.bio !== undefined ? dto.bio : user.bio,
      avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl : user.avatarUrl,
      preferredTopics: dto.preferredTopics !== undefined ? dto.preferredTopics : user.preferredTopics,
    });

    await this.auditService.log({
      actorId: userId,
      action: AuditEventType.PROFILE_UPDATED,
      resource: `User:${userId}`,
      result: 'SUCCESS',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { fields: Object.keys(dto) },
    });

    return this.toAuthUser(updated);
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
    meta: RequestMetadata = {},
  ): Promise<{ success: boolean }> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive.');
    }

    const currentHash = (user as any).passwordHash || (user as any).password_hash || '';
    const isValid = await verifyPassword(currentHash, dto.currentPassword);
    if (!isValid) {
      await this.auditService.log({
        actorId: userId,
        action: AuditEventType.LOGIN_FAILURE,
        resource: `Auth:ChangePassword:${userId}`,
        result: 'FAILURE',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'Incorrect current password' },
      });
      throw new UnauthorizedException('Current password does not match.');
    }

    const newPasswordHash = await hashPassword(dto.newPassword);
    await this.userRepo.update(userId, {
      passwordHash: newPasswordHash,
    });

    // Invalidate all existing refresh sessions on password change for security
    await this.sessionRepo.revokeAllUserSessions(userId);

    await this.auditService.log({
      actorId: userId,
      action: AuditEventType.PASSWORD_CHANGED,
      resource: `User:${userId}`,
      result: 'SUCCESS',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { success: true };
  }

  // ─── Forgot Password (Token Request) ──────────────────────────────────────────

  async forgotPassword(email: string, meta: RequestMetadata = {}): Promise<void> {
    // Always respond successfully to prevent user enumeration timing attacks
    const user = await this.userRepo.findByEmail(email.toLowerCase().trim());

    if (!user || !user.isActive) {
      // Constant-time dummy delay to prevent timing-based enumeration
      await dummyVerifyPassword('placeholder');
      return;
    }

    // Generate a cryptographically secure reset token (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Persist hashed token + expiry on user record
    await this.userRepo.setPasswordResetToken(user.id, tokenHash, expiresAt);

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.PASSWORD_RESET_REQUESTED,
      resource: `User:${user.id}`,
      result: 'SUCCESS',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // In development: log the reset link to the console for testing
    // In production: replace this with an email-sending service (e.g. SendGrid, Nodemailer)
    const clientUrl = this.config.get('CLIENT_URL', { infer: true }) || 'http://localhost:5173';
    const resetLink = `${clientUrl}/reset-password?token=${rawToken}`;
    console.log('\n--- PASSWORD RESET LINK (dev-only, replace with email in prod) ---');
    console.log(`Email: ${email}`);
    console.log(`Reset URL: ${resetLink}`);
    console.log('Token expires in: 1 hour\n');
  }

  // ─── Reset Password (Token Validation + Update) ────────────────────────────────

  async resetPassword(token: string, newPassword: string, meta: RequestMetadata = {}): Promise<void> {
    if (!token || token.length !== 64) {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.userRepo.findByPasswordResetToken(tokenHash);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }

    // Hash the new password and clear the reset token
    const hashedPassword = await hashPassword(newPassword);
    await this.userRepo.updatePassword(user.id, hashedPassword);
    await this.userRepo.clearPasswordResetToken(user.id);

    // Revoke all sessions so existing sessions are invalidated
    await this.sessionRepo.revokeAllUserSessions(user.id);

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.PASSWORD_RESET_COMPLETED,
      resource: `User:${user.id}`,
      result: 'SUCCESS',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}
