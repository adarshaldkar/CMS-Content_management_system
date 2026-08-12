import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { EnvConfig } from './config/env.schema';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get<ConfigService<EnvConfig, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  const clientUrl = config.get('CLIENT_URL', { infer: true });
  const nodeEnv = config.get('NODE_ENV', { infer: true });

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
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Cookie Parser
  app.use(cookieParser());

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
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CMS Platform API')
      .setDescription('Hardened Editorial Content Platform API (OWASP Top 10:2025 Compliant)')
      .setVersion('0.2.0')
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  console.log(`API running at http://localhost:${port}/api`);
  if (nodeEnv !== 'production') {
    console.log(`Swagger at http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
