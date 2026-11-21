import { STATUS_CODES } from 'node:http';
import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class HttpExceptionFilter extends BaseExceptionFilter<unknown> {
  private readonly logger = new Logger('HTTP');

  override handleUnknownError(error: unknown, host: ArgumentsHost) {
    const status = this.isHttpError(error) && Number.isInteger(error.statusCode)
      && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    if (status === 500) this.logger.error('Unexpected server error (HTTP 500)');
    super.catch(new HttpException(STATUS_CODES[status] ?? 'Request failed', status), host);
  }
}
