import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  private readonly logger = new Logger(IdempotencyGuard.name);

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    // Only apply to state-modifying requests
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return true;
    }

    const idempotencyKey =
      req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return true; // No key provided: proceed normally
    }

    const userId = req.user?.id || 'anonymous';
    const operation = `${req.method}:${req.route?.path || req.path}`;

    const check = await this.redisService.checkAndSetIdempotency(
      userId,
      operation,
      idempotencyKey,
      30, // 30-second in-flight lease
    );

    if (check.status === 'PENDING') {
      throw new ConflictException(
        'A mutation with this Idempotency-Key is currently in-flight. Please retry in a few seconds.',
      );
    }

    if (check.status === 'COMPLETED') {
      res.setHeader('X-Idempotent-Replay', 'true');
      res.status(200).json(check.result);
      return false; // Request handled from idempotency cache
    }

    // Attach hook to capture response JSON
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Save completed result asynchronously
      this.redisService
        .saveIdempotencyResult(userId, operation, idempotencyKey, body, 86400)
        .catch((err) => {
          this.logger.warn(`Failed to save idempotency result: ${err.message}`);
        });
      return originalJson(body);
    };

    return true;
  }
}
