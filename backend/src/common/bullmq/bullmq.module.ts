import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { Queues } from '../constants/queues';

/**
 * Registers BullMQ connection + named queues.
 * Processors are added in Sync / AI / Actions phases.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          url: config.redisUrl,
          maxRetriesPerRequest: null,
        },
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
  exports: [BullModule],
})
export class BullMqRootModule {}
