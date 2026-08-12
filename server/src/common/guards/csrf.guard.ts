import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { EnvConfig } from '../../config/env.schema';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Safe read methods (GET, HEAD, OPTIONS) do not alter server state
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // 1. Enforce custom header requirement on mutating requests (POST, PUT, PATCH, DELETE)
    const customHeader =
      request.headers['x-requested-with'] || request.headers['X-Requested-With'];
    if (!customHeader || customHeader !== 'XMLHttpRequest') {
      throw new ForbiddenException(
        'CSRF Protection: Missing or invalid X-Requested-With header.',
      );
    }

    // 2. Validate Origin / Referer against CORS allowlist
    const origin = request.headers['origin'] || request.headers['referer'];
    const clientUrl = this.config.get('CLIENT_URL', { infer: true }) || 'http://localhost:5173';

    if (origin && typeof origin === 'string') {
      const allowedOrigins = [
        clientUrl.toLowerCase(),
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
      ];

      const isAllowed = allowedOrigins.some((allowed) =>
        origin.toLowerCase().startsWith(allowed),
      );

      if (!isAllowed) {
        throw new ForbiddenException('CSRF Protection: Untrusted request origin.');
      }
    }

    return true;
  }
}
