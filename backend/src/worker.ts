import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppConfigService } from './common/config/app-config.service';
import { WorkerAppModule } from './worker/worker-app.module';

/**
 * BullMQ worker process — consumes queues, registers schedules.
 * Sync processors are no-ops until the sync phase ships.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  logger.log(
    `${config.appName} worker ready (${config.nodeEnv}) — processors registered`,
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
