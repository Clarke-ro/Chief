import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { Queues } from '../constants/queues';
import { DEFAULT_JOB_OPTIONS } from './job-options';
import { QueueService } from './queue.service';

function redisConnectionFromUrl(url: string) {
  const useTls = url.startsWith('rediss://');
  return {
    url,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: true,
    ...(useTls ? { tls: {} } : {}),
  };
}

/**
 * Registers BullMQ connection + named queues.
 * API process: producers via QueueService.
 * Worker process: processors in WorkerModule.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: redisConnectionFromUrl(config.redisUrl),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    }),
    BullModule.registerQueue(
      { name: Queues.SYNC },
      { name: Queues.AI },
      { name: Queues.ACTIONS },
      { name: Queues.BRIEFING },
      { name: Queues.ANALYTICS },
      { name: Queues.NOTIFICATIONS },
    ),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class BullMqRootModule {}
