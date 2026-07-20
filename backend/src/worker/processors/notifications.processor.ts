import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queues } from '../../common/constants/queues';

@Processor(Queues.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(
      { jobId: job.id, name: job.name },
      'Notifications job received (no-op)',
    );
  }
}
