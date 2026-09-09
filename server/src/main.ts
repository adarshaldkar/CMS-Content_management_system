import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { useContainer } from 'class-validator';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import type { EnvConfig } from './config/env.schema';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const bootStart = performance.now();

  const app = await NestFactory.create(AppModule);
  const nestCreated = performance.now();
  console.log(`[BOOT] NestFactory.create: ${(nestCreated - bootStart).toFixed(1)}ms`);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Enable graceful shutdown lifecycle hooks (SIGTERM, SIGINT) to drain pools and workers cleanly
  app.enableShutdownHooks();

  const config = app.get<ConfigService<EnvConfig, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  const clientUrl = config.get('CLIENT_URL', { infer: true });
  const nodeEnv = config.get('NODE_ENV', { infer: true });

  // Serve static uploaded assets
  // Trust proxy headers only in production (so rate limiting, CSRF origin checks
  // and audit IP logging see real client addresses behind a reverse proxy)
  (app.getHttpAdapter().getInstance() as express.Express).set(
    'trust proxy',
    nodeEnv === 'production' ? 1 : false,
  );

  // Security heads-up: flag connection strings that embed plain-text credentials.
  // Production should inject secrets via environment variables / a vault.
  const embeddedCredentialCheck = (url?: string): boolean =>
    typeof url === 'string' && /\/\/[^:\/@]+:[^@\/]+@/.test(url);

  const urlsWithCredentials = [
    config.get('DATABASE_URL', { infer: true }),
    config.get('MONGO_URI', { infer: true }),
    config.get('MARIADB_URL', { infer: true }),
    config.get('MYSQL_URL', { infer: true }),
    config.get('COCKROACH_URL', { infer: true }),
    config.get('CLICKHOUSE_URL', { infer: true }),
  ].filter((url): url is string => embeddedCredentialCheck(url));

  if (urlsWithCredentials.length > 0) {
    console.warn(
      `[Security] ${urlsWithCredentials.length} connection string(s) embed plain-text credentials in the .env file. ` +
        'These are only safe for local development — rotate any credentials shared outside this machine ' +
        'and switch to environment-variable/secret-manager injection in production.',
    );
  }

  const uploadDir = fs.existsSync(path.resolve(process.cwd(), 'uploads'))
    ? path.resolve(process.cwd(), 'uploads')
    : path.resolve(process.cwd(), 'server', 'uploads');
  app.use('/uploads', express.static(uploadDir));

  // 1. Security Headers with tailored Content Security Policy
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
          scriptSrc: ["'self'", ...(nodeEnv !== 'production' ? ["'unsafe-eval'"] : [])],
          connectSrc: ["'self'", clientUrl, 'ws://localhost:5173', 'http://localhost:5173'],
          frameSrc: [
            "'self'",
            'https://www.youtube-nocookie.com',
            'https://www.youtube.com',
            'https://player.vimeo.com',
            'https://www.loom.com',
            'https://open.spotify.com',
            'https://platform.twitter.com',
            'https://syndication.twitter.com',
          ],
          mediaSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Cookie Parser
  app.use(cookieParser());

  // 2b. Global input validation (OWASP A03 Injection/Mass-Assignment defense)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  // 3. Global Prefix & Exception Filter
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 4. Strict CORS
  app.enableCors({
    origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });

  // 5. Swagger Documentation
  if (nodeEnv !== 'production') {
    const swaggerStart = performance.now();
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CMS Platform API')
      .setDescription('Hardened Editorial Content Platform API (OWASP Top 10:2025 Compliant)')
      .setVersion('0.2.0')
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`[BOOT] Swagger setup: ${(performance.now() - swaggerStart).toFixed(1)}ms`);
  }

  const listenStart = performance.now();
  await app.listen(port);
  const totalBootTime = (performance.now() - bootStart).toFixed(1);
  console.log(`[BOOT] Server listening: ${(performance.now() - listenStart).toFixed(1)}ms`);
  console.log(`[BOOT] Total Backend Startup Time: ${totalBootTime}ms (~${(Number(totalBootTime) / 1000).toFixed(2)}s)`);
  console.log(`API running at http://localhost:${port}/api`);
  if (nodeEnv !== 'production') {
    console.log(`Swagger at http://localhost:${port}/api/docs`);
  }
}

void bootstrap();

