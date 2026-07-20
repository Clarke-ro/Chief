import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './common/config/app-config.service';

/**
 * BullMQ worker process entrypoint (same codebase as API).
 * Processors are registered in later phases; this boots infrastructure only.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  logger.log(
    `${config.appName} worker context ready (${config.nodeEnv}) — no processors registered yet`,
  );

  const shutdown = async (signal: string) => {
    logger.log(`Worker received ${signal}, shutting down`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
