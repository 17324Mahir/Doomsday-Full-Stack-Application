import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './http-exception.filter';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter';

export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '32kb' });
  app.useBodyParser('urlencoded', { limit: '32kb', extended: false });
  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? ['http://localhost:5173', 'http://127.0.0.1:5173'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
  }));
  app.useGlobalFilters(new HttpExceptionFilter(app.getHttpAdapter()), new PrismaExceptionFilter());

  const showDocs = process.env.ENABLE_API_DOCS === undefined
    ? process.env.NODE_ENV !== 'production'
    : process.env.ENABLE_API_DOCS === 'true';
  if (showDocs) {
    const config = new DocumentBuilder()
      .setTitle('Doomsday Ready API')
      .setDescription('Movie prerequisites, rewatch plans, and cinema seat bundles.')
      .setVersion('1.0')
      .build();
    SwaggerModule.setup('api-docs', app, SwaggerModule.createDocument(app, config));
  }
  return app;
}

async function start() {
  const app = await createApp();
  const socket = process.env.API_SOCKET;
  if (socket) {
    await app.listen(socket);
  } else {
    await app.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '127.0.0.1');
  }
}

if (require.main === module) {
  start().catch(() => {
    console.error('API startup failed. Check the database configuration and listen address.');
    process.exitCode = 1;
  });
}
