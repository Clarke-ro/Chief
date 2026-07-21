import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { BriefingModule } from '../briefing/briefing.module';
import { BullMqRootModule } from '../common/bullmq/bullmq.module';
import { QueueService } from '../common/bullmq/queue.service';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SyncCoreModule } from '../sync/sync-core.module';
import { ActionsProcessor } from './processors/actions.processor';
import { AiProcessor } from './processors/ai.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { BriefingProcessor } from './processors/briefing.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { SyncProcessor } from './processors/sync.processor';

/**
 * Worker-only providers (BullMQ processors + schedule registration).
 * Do not import this into the HTTP AppModule — API should produce, not consume.
 */
@Module({
  imports: [
    CommonModule,
    BullMqRootModule,
    SyncCoreModule,
    BriefingModule,
    NotificationsModule,
  ],
  providers: [
    SyncProcessor,
    BriefingProcessor,
    AnalyticsProcessor,
    NotificationsProcessor,
    AiProcessor,
    ActionsProcessor,
  ],
})
export class WorkerModule implements OnModuleInit {
  private readonly logger = new Logger(WorkerModule.name);

  constructor(private readonly queues: QueueService) {}

  async onModuleInit(): Promise<void> {
    await this.queues.ensureScheduledJobs();
    this.logger.log('Worker processors online; schedules registered');
  }
}
