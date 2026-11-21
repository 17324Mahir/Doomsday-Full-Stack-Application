import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

type DatabaseError = Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientInitializationError
  | Prisma.PrismaClientUnknownRequestError;

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientInitializationError, Prisma.PrismaClientUnknownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Database');

  catch(error: DatabaseError, host: ArgumentsHost) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : '';
    const model = error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.modelName : undefined;
    let statusCode = 500;
    let message = 'The database could not complete the request.';

    switch (code) {
      case 'P2002':
        statusCode = 409;
        message = model === 'Cinema' ? 'Cinema name already exists' : 'Movie title already exists';
        break;
      case 'P2003':
        statusCode = 404;
        message = 'One or more prerequisite movies do not exist';
        break;
      case 'P2025':
        statusCode = 404;
        message = model === 'Cinema' ? 'Cinema not found' : 'Movie not found';
        break;
      case 'P1001':
      case 'P1002':
      case 'P1008':
      case 'P1017':
      case 'P2024':
      case 'P2028':
      case 'P2034':
        statusCode = 503;
        message = 'The database is busy or unavailable. Please try again.';
        break;
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      statusCode = 503;
      message = 'The database is unavailable. Please try again.';
    }
    if (statusCode >= 500) this.logger.error(`Database request failed (${code || 'unavailable'}, HTTP ${statusCode})`);
    host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message });
  }
}
