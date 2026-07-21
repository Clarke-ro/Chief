import { createServer } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppConfigService } from './common/config/app-config.service';
import { WorkerAppModule } from './worker/worker-app.module';

/**
 * BullMQ worker process — consumes queues, registers schedules.
 * Sync, briefing, and notification processors are live.
 *
 * Exposes a tiny /health/live so Railway can use the same healthcheck
 * path as the API without binding Nest HTTP.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  const port = config.port;
  const healthServer = createServer((req, res) => {
    if (req.url === '/health/live' || req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', role: 'worker' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve, reject) => {
    healthServer.once('error', reject);
    healthServer.listen(port, () => resolve());
  });

  logger.log(
    `${config.appName} worker ready (${config.nodeEnv}) on :${port} — processors registered`,
  );

  const shutdown = async (signal: string) => {
    logger.log(`Worker received ${signal}, shutting down`);
    await new Promise<void>((resolve) => healthServer.close(() => resolve()));
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
