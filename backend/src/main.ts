import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { BETTER_AUTH } from './auth/auth.constants';
import type { BetterAuthInstance } from './auth/better-auth.factory';
import { AppConfigService } from './common/config/app-config.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  const config = app.get(AppConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  const auth = app.get<BetterAuthInstance>(BETTER_AUTH);

  // Railway / reverse proxies terminate TLS in front of the app.
  expressApp.set('trust proxy', 1);

  // Better Auth Expo: copy expo-origin → origin for native clients (Expo Go sends no Origin header).
  expressApp.use('/api/auth', (req, _res, next) => {
    if (!req.headers.origin && req.headers['expo-origin']) {
      const expoOrigin = req.headers['expo-origin'];
      req.headers.origin = Array.isArray(expoOrigin)
        ? expoOrigin[0]
        : expoOrigin;
    }
    next();
  });

  expressApp.all(/^\/api\/auth\/.*$/, toNodeHandler(auth));
  expressApp.use(express.json({ limit: '2mb' }));
  expressApp.use(express.urlencoded({ extended: true }));

  app.use(helmet());
  // Never reflect arbitrary Origin with credentials — allowlist only.
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'expo-origin',
      'x-skip-oauth-proxy',
    ],
  });

  app.setGlobalPrefix(config.apiPrefix, {
    exclude: [
      '',
      'health',
      'health/(.*)',
      'docs',
      'docs-json',
      'api/auth',
      'api/auth/(.*)',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(config.isProduction));

  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Chief API')
      .setDescription(
        'AI Chief of Staff backend — auth, workspaces, and official OAuth integrations.',
      )
      .setVersion('0.2.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.port);
  logger.log(
    `${config.appName} listening on :${config.port} (${config.nodeEnv})`,
  );
}

void bootstrap();
