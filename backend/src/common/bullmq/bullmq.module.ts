import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { Queues } from '../constants/queues';
import { REDIS_RESOLVED_URL } from '../redis/redis.constants';
import { RedisModule } from '../redis/redis.module';
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
 * Uses the same resolved Redis URL as RedisModule (primary → fallbacks).
 */
@Global()
@Module({
  imports: [
    RedisModule,
    BullModule.forRootAsync({
      inject: [REDIS_RESOLVED_URL],
      useFactory: (redisUrl: string) => ({
        connection: redisConnectionFromUrl(redisUrl),
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
