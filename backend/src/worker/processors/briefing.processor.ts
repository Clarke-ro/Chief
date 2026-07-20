import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queues } from '../../common/constants/queues';

@Processor(Queues.BRIEFING)
export class BriefingProcessor extends WorkerHost {
  private readonly logger = new Logger(BriefingProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(
      { jobId: job.id, name: job.name },
      'Briefing job received (no-op)',
    );
  }
}
