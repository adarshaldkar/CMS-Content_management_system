import { ArgumentsHost, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter (OWASP A10 Error Redaction)', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should redact raw database errors and attach a correlation referenceId', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    const mockHost: ArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: mockStatus,
        }),
        getRequest: () => ({
          method: 'GET',
          url: '/api/articles',
        }),
      }),
    } as unknown as ArgumentsHost;

    // Simulate raw Postgres / Mongo native query error
    const rawDbError = new Error('PostgresError: syntax error at or near "SELECT" table "cms_articles"');

    filter.catch(rawDbError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'An error occurred while processing your request.',
        referenceId: expect.stringMatching(/^ERR-\d{8}-[A-F0-9]{6}$/),
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle standard HttpExceptions with sanitized output', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    const mockHost: ArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: mockStatus,
        }),
        getRequest: () => ({
          method: 'POST',
          url: '/api/auth/login',
        }),
      }),
    } as unknown as ArgumentsHost;

    const httpException = new InternalServerErrorException('Custom safe error message');

    filter.catch(httpException, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Custom safe error message',
        referenceId: expect.stringMatching(/^ERR-\d{8}-[A-F0-9]{6}$/),
      }),
    );
  });
});
