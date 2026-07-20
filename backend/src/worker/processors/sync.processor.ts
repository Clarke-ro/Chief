import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queues } from '../../common/constants/queues';
import type { SyncAccountJobData } from '../../common/bullmq/queue.service';

/**
 * Sync pipeline stub — receives jobs but does not pull provider data yet.
 * Google → Queue → Worker → Database wiring lands in the next phase.
 */
@Processor(Queues.SYNC)
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  async process(job: Job<SyncAccountJobData | Record<string, unknown>>): Promise<void> {
    this.logger.log(
      {
        jobId: job.id,
        name: job.name,
        data: job.data,
      },
      'Sync job received (no-op — sync not implemented yet)',
    );
  }
}
