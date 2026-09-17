import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.schema';

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async verifyToken(token?: string, ipAddress?: string): Promise<boolean> {
    const nodeEnv = this.config.get('NODE_ENV', { infer: true });
    const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    // Test/Dev mode bypass or dummy token pass
    if (token === 'cf-turnstile-dummy-pass' || (!secretKey && nodeEnv !== 'production')) {
      this.logger.debug('[Turnstile] Bypassed verification for test/dev token');
      return true;
    }

    if (!token) {
      throw new BadRequestException('Human verification challenge token missing. Please complete the captcha.');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey || '1x0000000000000000000000000000000AA'); // Default Cloudflare pass key for testing
      formData.append('response', token);
      if (ipAddress) {
        formData.append('remoteip', ipAddress);
      }

      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      const outcome = await res.json();
      if (!outcome.success) {
        this.logger.warn(`[Turnstile] Verification failed: ${JSON.stringify(outcome['error-codes'])}`);
        throw new BadRequestException('Cloudflare Turnstile human verification failed. Please try again.');
      }

      return true;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`[Turnstile] Error verifying token: ${err.message}`);
      // Fail closed in production, fail open in local dev if external service is unreachable
      if (nodeEnv === 'production') {
        throw new BadRequestException('Unable to verify security challenge at this time.');
      }
      return true;
    }
  }
}
