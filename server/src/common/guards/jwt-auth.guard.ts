import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import type { Request } from 'express';
import type { EnvConfig } from '../../config/env.schema';
import {
  IS_PUBLIC_KEY,
} from '../decorators/security.decorators';
import {
  ROLE_PERMISSIONS,
  type AuthUser,
  type JwtAccessPayload,
} from '../../domain/models';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const cookies = request.cookies || {};
    const token = cookies['__Host-access'] || cookies['access_token'];

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    const secret = this.config.get('JWT_ACCESS_SECRET', { infer: true });

    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: 'cms-platform',
        audience: 'cms-client',
      }) as JwtAccessPayload;

      if (decoded.type !== 'access') {
        throw new UnauthorizedException('Invalid token type.');
      }

      const permissions = ROLE_PERMISSIONS[decoded.role] ?? [];

      const authUser: AuthUser = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        permissions,
        isActive: true,
      };

      (request as any).user = authUser;
      return true;
    } catch {
      throw new UnauthorizedException('Session expired or invalid token.');
    }
  }
}
