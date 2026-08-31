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

    // 2. Validate Origin / Referer against the CORS allowlist (exact match)
    const rawOrigin = request.headers['origin'];
    const rawReferer = request.headers['referer'];

    let originSource: string | undefined;
    if (typeof rawOrigin === 'string' && rawOrigin.length > 0) {
      originSource = rawOrigin;
    } else if (typeof rawReferer === 'string' && rawReferer.length > 0) {
      try {
        originSource = new URL(rawReferer).origin;
      } catch {
        originSource = undefined;
      }
    }

    if (!originSource) {
      throw new ForbiddenException(
        'CSRF Protection: Missing Origin/Referer header.',
      );
    }

    const clientUrl = this.config.get('CLIENT_URL', { infer: true }) || 'http://localhost:5173';

    const allowedOrigins = [
      clientUrl,
      'http://localhost:5173',
      'http://localhost:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3001',
    ].map((origin) => origin.toLowerCase().replace(/\/+$/, ''));

    const normalizedOrigin = originSource.toLowerCase().replace(/\/+$/, '');

    if (!allowedOrigins.includes(normalizedOrigin)) {
      throw new ForbiddenException('CSRF Protection: Untrusted request origin.');
    }

    return true;
  }
}
