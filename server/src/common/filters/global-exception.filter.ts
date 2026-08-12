import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';

export interface SanitizedErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  referenceId: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate unique correlation ID for tracking
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const referenceId = `ERR-${dateStr}-${randomHex}`;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal error occurred.';
    let errorName = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj['message'] as string) || exception.message;
        errorName = (obj['error'] as string) || exception.name;
      }
    } else {
      // Unhandled / Database / Native errors
      const err = exception as Error;
      // Strip any raw database leaks or sensitive information
      if (err?.message?.includes('duplicate key') || err?.message?.includes('unique constraint')) {
        statusCode = HttpStatus.CONFLICT;
        message = 'A resource with these unique properties already exists.';
        errorName = 'Conflict';
      } else {
        message = 'An error occurred while processing your request.';
      }
    }

    // Never leak database stack traces or internal names to the client
    const sanitizedErrorName = errorName.replace(/Postgres|Mongo|Mongoose|Sql|Query/gi, 'Application');

    const sanitizedResponse: SanitizedErrorResponse = {
      statusCode,
      message,
      error: sanitizedErrorName,
      referenceId,
      timestamp: new Date().toISOString(),
    };

    // Log the complete context internally for developers
    const err = exception as Error;
    this.logger.error(
      `[${referenceId}] ${request.method} ${request.url} - ${statusCode} - ${err?.message || message}`,
      err?.stack,
    );

    response.status(statusCode).json(sanitizedResponse);
  }
}
