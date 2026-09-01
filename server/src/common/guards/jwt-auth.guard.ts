import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
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
import { USER_REPOSITORY, type IUserRepository } from '../../repositories/interfaces/user.repository.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

      if (decoded.type !== 'access' || !decoded.sub || !decoded.jti || !decoded.role) {
        throw new UnauthorizedException('Invalid access token.');
      }

      // Authorization state is resolved server-side on every protected request.
      // This makes account suspension/deactivation and role changes effective
      // immediately instead of waiting for an already-issued access token to expire.
      const userRepo = this.moduleRef.get<IUserRepository>(USER_REPOSITORY, { strict: false });
      const currentUser = await userRepo.findById(decoded.sub);
      if (!currentUser || !currentUser.isActive) {
        throw new UnauthorizedException('Session expired or account is inactive.');
      }

      const permissions = ROLE_PERMISSIONS[currentUser.role] ?? [];

      const authUser: AuthUser = {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        bio: currentUser.bio,
        avatarUrl: currentUser.avatarUrl,
        preferredTopics: currentUser.preferredTopics ?? [],
        role: currentUser.role,
        permissions,
        isActive: currentUser.isActive,
      };

      (request as any).user = authUser;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Session expired or invalid token.');
    }
  }
}
