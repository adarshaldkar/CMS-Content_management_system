import { ArgumentsHost, InternalServerErrorException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  it('does not expose 5xx exception messages', () => {
    const filter = new GlobalExceptionFilter();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url: '/api/test' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new InternalServerErrorException('SELECT * FROM secret_table'), host);

    expect(json).toHaveBeenCalledTimes(1);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe('An unexpected internal error occurred.');
    expect(JSON.stringify(body)).not.toContain('secret_table');
  });
});
