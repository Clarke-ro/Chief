import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { SyncResource } from '@prisma/client';
import type { Job } from 'bullmq';
import type { SyncAccountJobData } from '../../common/bullmq/queue.service';
import { Queues } from '../../common/constants/queues';
import { SyncOrchestratorService } from '../../sync/orchestrator/sync-orchestrator.service';
import { SyncPipelineService } from '../../sync/pipeline/sync-pipeline.service';
import type { SyncReason } from '../../sync/sync.types';

const RESOURCE_JOBS = new Set([
  'sync.calendar',
  'sync.email',
  'sync.contacts',
  'sync.tasks',
  'sync.messages',
]);

@Processor(Queues.SYNC)
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly orchestrator: SyncOrchestratorService,
    private readonly pipeline: SyncPipelineService,
  ) {
    super();
  }

  async process(job: Job<SyncAccountJobData | Record<string, unknown>>): Promise<void> {
    this.logger.log({ jobId: job.id, name: job.name }, 'Sync job started');

    if (job.name === 'sync.due-accounts') {
      await this.orchestrator.enqueueDueAccounts();
      return;
    }

    if (job.name === 'sync.account') {
      await this.orchestrator.expandAccountJob(job.data as SyncAccountJobData);
      return;
    }

    if (RESOURCE_JOBS.has(job.name)) {
      const data = job.data as SyncAccountJobData;
      const resource = data.resource ?? jobNameToResource(job.name);
      if (!resource) {
        throw new Error(`Unknown sync resource for job ${job.name}`);
      }
      const reason = (data.reason ?? 'manual') as SyncReason;
      if (reason === 'historical' && !data.historical) {
        throw new Error('Historical sync jobs must set historical=true');
      }

      const result = await this.pipeline.runResourceJob({
        workspaceId: data.workspaceId,
        connectedAccountId: data.connectedAccountId,
        resource,
        reason,
        historicalLookbackDays: data.lookbackDays,
      });

      this.logger.log(
        {
          jobId: job.id,
          resource,
          itemCount: result.itemCount,
          stub: result.stub,
        },
        'Sync resource job finished',
      );
      return;
    }

    this.logger.warn({ name: job.name }, 'Unhandled sync job name');
  }
}

function jobNameToResource(name: string): SyncResource | null {
  switch (name) {
    case 'sync.calendar':
      return SyncResource.calendar;
    case 'sync.email':
      return SyncResource.email;
    case 'sync.contacts':
      return SyncResource.contacts;
    case 'sync.tasks':
      return SyncResource.tasks;
    case 'sync.messages':
      return SyncResource.messages;
    default:
      return null;
  }
}
