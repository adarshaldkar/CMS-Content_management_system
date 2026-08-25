import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { USER_REPOSITORY, type IUserRepository } from '../../repositories/interfaces/user.repository.interface';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditEventType, type AuthUser } from '../../domain/models';

@Injectable()
export class HighAssuranceAdminGuard implements CanActivate {
  private readonly logger = new Logger(HighAssuranceAdminGuard.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const user: AuthUser | undefined = (request as any).user;

    // 1. Must be authenticated
    if (!user || !user.id) {
      throw new UnauthorizedException('Administrative access requires active high-assurance authentication.');
    }

    // 2. Strict Role Check: Must be SUPER_ADMIN, ADMIN, or EDITOR
    const staffRoles = ['super_admin', 'admin', 'editor', 'SUPER_ADMIN', 'ADMIN', 'EDITOR'];
    if (!staffRoles.includes(user.role)) {
      this.logger.warn(
        `[SECURITY PERIMETER ALERT] Unauthorized administrative zone attempt by user ${user.id} (${user.email}, role=${user.role}) from IP ${request.ip}`,
      );

      // Record security incident in immutable audit log
      this.auditService.log({
        action: AuditEventType.ADMIN_PERIMETER_BLOCKED,
        actorId: user.id,
        resource: request.originalUrl,
        result: 'BLOCKED',
        ipAddress: request.ip || null,
        userAgent: (request.headers['user-agent'] as string) || null,
        metadata: {
          attemptedPath: request.originalUrl,
          method: request.method,
          userRole: user.role,
        },
      }).catch((err) => {
        this.logger.error(`Failed to record security audit log: ${err.message}`);
      });

      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Security Perimeter Alert: Your account lacks high-assurance administrative clearance.',
        code: 'PERM_ADMIN_ACCESS_DENIED',
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Real-Time Active Status Check (Verify user was not banned or suspended)
    const freshUser = await this.userRepo.findById(user.id);
    if (!freshUser || !freshUser.isActive) {
      this.logger.warn(`[SECURITY ALERT] Suspended administrator ${user.id} attempted action ${request.method} ${request.originalUrl}`);
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Administrative account has been suspended or revoked.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // 4. Inject High-Assurance HTTP Response Headers to block caching and sniffing
    response.setHeader('X-Admin-Security-Clearance', user.role.toUpperCase());
    response.setHeader('X-Admin-Security-Enforcement', 'HIGH_ASSURANCE_LEVEL_3');
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');

    // 5. Log all mutating administrative actions into Audit Registry
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      this.auditService.log({
        action: AuditEventType.ADMIN_MUTATION,
        actorId: user.id,
        resource: `${request.method} ${request.originalUrl}`,
        result: 'SUCCESS',
        ipAddress: request.ip || null,
        userAgent: (request.headers['user-agent'] as string) || null,
        metadata: {
          method: request.method,
          path: request.originalUrl,
          bodyKeys: Object.keys(request.body || {}),
        },
      }).catch((err) => {
        this.logger.error(`Failed to log admin mutation: ${err.message}`);
      });
    }

    return true;
  }
}
