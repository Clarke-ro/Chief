import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedAccountStatus,
  SyncResource,
  SyncRunStatus,
} from '@prisma/client';
import {
  QueueService,
  type SyncAccountJobData,
} from '../../common/bullmq/queue.service';
import type { SyncJobName } from '../../common/constants/queues';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProviderRegistry } from '../../integrations/providers/provider.registry';
import { SyncPolicyService } from '../policies/sync-policy.service';
import type { SyncReason } from '../sync.types';

const RESOURCE_JOB: Record<SyncResource, SyncJobName> = {
  calendar: 'sync.calendar',
  email: 'sync.email',
  contacts: 'sync.contacts',
  tasks: 'sync.tasks',
  messages: 'sync.messages',
};

@Injectable()
export class SyncOrchestratorService {
  private readonly logger = new Logger(SyncOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
    private readonly policies: SyncPolicyService,
    private readonly registry: ProviderRegistry,
  ) {}

  async enqueueDueAccounts() {
    const accounts = await this.prisma.connectedAccount.findMany({
      where: { status: ConnectedAccountStatus.active },
      include: { syncStates: true },
    });

    let enqueued = 0;
    for (const account of accounts) {
      const resources = this.resourcesForAccount(account.provider);
      for (const resource of resources) {
        const policy = this.policies.get(account.provider, resource);
        if (!policy) continue;
        const state = account.syncStates.find((s) => s.resource === resource);
        const due = this.policies.isDue({
          policy,
          lastSyncedAt: state?.lastSyncedAt ?? null,
          status: state?.status ?? SyncRunStatus.idle,
        });
        if (!due) continue;
        const ok = await this.enqueueResourceJob({
          workspaceId: account.workspaceId,
          connectedAccountId: account.id,
          resource,
          reason: 'schedule',
        });
        if (ok) enqueued += 1;
      }
    }

    this.logger.log({ enqueued }, 'Due-account sync fan-out complete');
    return { enqueued };
  }

  async expandAccountJob(data: SyncAccountJobData) {
    const reason = normalizeReason(data.reason);
    if (reason === 'historical' && !data.historical) {
      throw new Error('Historical sync requires historical=true');
    }

    const account = await this.prisma.connectedAccount.findFirst({
      where: {
        id: data.connectedAccountId,
        workspaceId: data.workspaceId,
        status: ConnectedAccountStatus.active,
      },
    });
    if (!account) {
      this.logger.warn(
        { connectedAccountId: data.connectedAccountId },
        'expandAccountJob: account missing',
      );
      return { enqueued: 0 };
    }

    const resources = data.resource
      ? [data.resource]
      : this.resourcesForAccount(account.provider);

    let enqueued = 0;
    for (const resource of resources) {
      const ok = await this.enqueueResourceJob({
        workspaceId: account.workspaceId,
        connectedAccountId: account.id,
        resource,
        reason,
        historical: data.historical,
        lookbackDays: data.lookbackDays,
        lookaheadDays: data.lookaheadDays,
      });
      if (ok) enqueued += 1;
    }
    return { enqueued };
  }

  async triggerOnboarding(input: {
    workspaceId: string;
    connectedAccountId: string;
  }) {
    await this.queues.enqueueSync(
      'sync.account',
      {
        workspaceId: input.workspaceId,
        connectedAccountId: input.connectedAccountId,
        reason: 'onboarding',
      },
      { jobId: dedupeId(input.connectedAccountId, 'account', 'onboarding') },
    );
  }

  async triggerManual(input: {
    workspaceId: string;
    connectedAccountId: string;
    resource?: SyncResource;
  }) {
    if (input.resource) {
      await this.enqueueResourceJob({
        workspaceId: input.workspaceId,
        connectedAccountId: input.connectedAccountId,
        resource: input.resource,
        reason: 'manual',
      });
      return { jobName: RESOURCE_JOB[input.resource] };
    }

    await this.queues.enqueueSync(
      'sync.account',
      {
        workspaceId: input.workspaceId,
        connectedAccountId: input.connectedAccountId,
        reason: 'manual',
      },
      { jobId: dedupeId(input.connectedAccountId, 'account', 'manual') },
    );
    return { jobName: 'sync.account' as const };
  }

  async triggerRecovery(input: {
    workspaceId: string;
    connectedAccountId: string;
  }) {
    await this.queues.enqueueSync(
      'sync.account',
      {
        workspaceId: input.workspaceId,
        connectedAccountId: input.connectedAccountId,
        reason: 'recovery',
      },
      { jobId: dedupeId(input.connectedAccountId, 'account', 'recovery') },
    );
  }

  async triggerHistorical(input: {
    workspaceId: string;
    connectedAccountId: string;
    resource?: SyncResource;
    lookbackDays: number;
  }) {
    if (input.lookbackDays < 1 || input.lookbackDays > 365) {
      throw new Error('lookbackDays must be between 1 and 365');
    }
    await this.queues.enqueueSync('sync.account', {
      workspaceId: input.workspaceId,
      connectedAccountId: input.connectedAccountId,
      resource: input.resource,
      reason: 'historical',
      historical: true,
      lookbackDays: input.lookbackDays,
    });
  }

  private resourcesForAccount(provider: Parameters<ProviderRegistry['get']>[0]) {
    const def = this.registry.get(provider).definition;
    return this.policies.resourcesForCapabilities(provider, def.capabilities);
  }

  private async enqueueResourceJob(input: {
    workspaceId: string;
    connectedAccountId: string;
    resource: SyncResource;
    reason: SyncReason;
    historical?: boolean;
    lookbackDays?: number;
    lookaheadDays?: number;
  }) {
    if (input.reason === 'historical' && !input.historical) {
      this.logger.error('Refusing historical enqueue without historical flag');
      return false;
    }
    if (input.reason !== 'historical' && input.historical) {
      this.logger.error('historical flag requires reason=historical');
      return false;
    }

    const jobName = RESOURCE_JOB[input.resource];
    const jobId =
      input.reason === 'historical'
        ? undefined
        : dedupeId(input.connectedAccountId, input.resource, input.reason);

    try {
      await this.queues.enqueueSync(
        jobName,
        {
          workspaceId: input.workspaceId,
          connectedAccountId: input.connectedAccountId,
          resource: input.resource,
          reason: input.reason,
          historical: input.historical,
          lookbackDays: input.lookbackDays,
          lookaheadDays: input.lookaheadDays,
        },
        jobId ? { jobId } : undefined,
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists|Job.*exist/i.test(message)) {
        this.logger.debug(
          { jobId, resource: input.resource },
          'Duplicate sync job skipped',
        );
        return false;
      }
      throw error;
    }
  }
}

/** BullMQ custom job ids cannot contain `:`. */
function dedupeId(
  connectedAccountId: string,
  resource: string,
  reason: string,
) {
  return `sync-${connectedAccountId}-${resource}-${reason}`;
}

function normalizeReason(reason?: string): SyncReason {
  switch (reason) {
    case 'onboarding':
    case 'schedule':
    case 'manual':
    case 'recovery':
    case 'webhook':
    case 'historical':
      return reason;
    default:
      return 'manual';
  }
}
