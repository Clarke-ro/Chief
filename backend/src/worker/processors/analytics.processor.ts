import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queues } from '../../common/constants/queues';

@Processor(Queues.ANALYTICS)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(
      { jobId: job.id, name: job.name },
      'Analytics job received (no-op)',
    );
  }
}
