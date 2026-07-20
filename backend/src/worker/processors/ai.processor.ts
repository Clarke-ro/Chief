import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { Queues } from '../../common/constants/queues';

@Processor(Queues.AI)
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log({ jobId: job.id, name: job.name }, 'AI job received (no-op)');
  }
}
