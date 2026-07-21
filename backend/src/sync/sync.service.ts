import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ConnectedAccountStatus,
  IntegrationProvider,
  SyncResource,
  SyncRunStatus,
  type ConnectedAccount,
} from '@prisma/client';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { SyncOrchestratorService } from './orchestrator/sync-orchestrator.service';
import { SyncPipelineService } from './pipeline/sync-pipeline.service';
import type { SyncReason } from './sync.types';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly orchestrator: SyncOrchestratorService,
    private readonly pipeline: SyncPipelineService,
  ) {}

  async getStatus(user: AuthUser, connectedAccountId: string, workspaceId: string) {
    const account = await this.requireAccount(user, connectedAccountId, workspaceId);
    const states = await this.prisma.syncState.findMany({
      where: { connectedAccountId: account.id },
      orderBy: { resource: 'asc' },
    });
    return {
      connectedAccountId: account.id,
      provider: account.provider,
      states: states.map((s) => ({
        resource: s.resource,
        status: s.status,
        cursor: s.cursor,
        lastSyncedAt: s.lastSyncedAt,
        lastError: s.lastError,
        meta: s.meta,
      })),
    };
  }

  /** Workspace-level freshness for Home “last synced” UX. */
  async getWorkspaceFreshness(user: AuthUser, workspaceId: string) {
    await this.membership.requireMembership(user.id, workspaceId);

    const states = await this.prisma.syncState.findMany({
      where: { workspaceId },
      select: {
        resource: true,
        status: true,
        lastSyncedAt: true,
        lastError: true,
        connectedAccount: { select: { provider: true, status: true } },
      },
    });

    const active = states.filter(
      (s) => s.connectedAccount.status !== ConnectedAccountStatus.revoked,
    );
    const running = active.some((s) => s.status === SyncRunStatus.running);
    const failed = active.find((s) => s.status === SyncRunStatus.failed);
    const latest = active
      .map((s) => s.lastSyncedAt)
      .filter((v): v is Date => Boolean(v))
      .sort((a, b) => a.getTime() - b.getTime())
      .at(-1);

    return {
      workspaceId,
      lastSyncedAt: latest?.toISOString() ?? null,
      syncing: running,
      failed: Boolean(failed),
      lastError: failed?.lastError ?? null,
      resourceCount: active.length,
    };
  }

  async triggerManual(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
    resource?: SyncResource,
  ) {
    const account = await this.requireAccount(user, connectedAccountId, workspaceId);

    // Best-effort queue for a properly configured worker.
    try {
      await this.orchestrator.triggerManual({
        workspaceId: account.workspaceId,
        connectedAccountId: account.id,
        resource,
      });
    } catch (error) {
      this.logger.warn(
        {
          err: error instanceof Error ? error.message : String(error),
          connectedAccountId: account.id,
        },
        'Queue enqueue failed — continuing with in-process sync',
      );
    }

    // Always pull on the API so Home fills even when the worker service is misconfigured.
    const processed = await this.processInline(account, resource, 'manual');
    return { ok: true, jobName: 'sync.inline', processed };
  }

  async triggerHistorical(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
    lookbackDays: number,
    resource?: SyncResource,
  ) {
    const account = await this.requireAccount(user, connectedAccountId, workspaceId);
    try {
      await this.orchestrator.triggerHistorical({
        workspaceId: account.workspaceId,
        connectedAccountId: account.id,
        resource,
        lookbackDays,
      });
    } catch (error) {
      this.logger.warn(
        { err: error instanceof Error ? error.message : String(error) },
        'Historical enqueue failed — running inline',
      );
    }

    const resources = resource ? [resource] : this.inlineResourcesFor(account.provider);
    let processed = 0;
    for (const r of resources) {
      try {
        const result = await this.pipeline.runResourceJob({
          workspaceId: account.workspaceId,
          connectedAccountId: account.id,
          resource: r,
          reason: 'historical',
          historicalLookbackDays: lookbackDays,
        });
        processed += result.itemCount;
      } catch (error) {
        this.logger.warn(
          {
            resource: r,
            err: error instanceof Error ? error.message : String(error),
          },
          'Inline historical resource failed',
        );
      }
    }

    return { ok: true, historical: true, lookbackDays, processed };
  }

  async triggerRecovery(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
  ) {
    const account = await this.requireAccount(user, connectedAccountId, workspaceId);
    try {
      await this.orchestrator.triggerRecovery({
        workspaceId: account.workspaceId,
        connectedAccountId: account.id,
      });
    } catch {
      // ignore queue errors
    }
    const processed = await this.processInline(account, undefined, 'recovery');
    return { ok: true, recovery: true, processed };
  }

  private async processInline(
    account: ConnectedAccount,
    resource: SyncResource | undefined,
    reason: SyncReason,
  ): Promise<number> {
    const resources = resource
      ? [resource]
      : this.inlineResourcesFor(account.provider);

    let processed = 0;
    for (const r of resources) {
      try {
        const result = await this.pipeline.runResourceJob({
          workspaceId: account.workspaceId,
          connectedAccountId: account.id,
          resource: r,
          reason,
        });
        processed += result.itemCount;
        this.logger.log(
          {
            connectedAccountId: account.id,
            resource: r,
            itemCount: result.itemCount,
            stub: result.stub,
          },
          'Inline sync resource finished',
        );
      } catch (error) {
        this.logger.warn(
          {
            connectedAccountId: account.id,
            resource: r,
            err: error instanceof Error ? error.message : String(error),
          },
          'Inline sync resource failed',
        );
      }
    }
    return processed;
  }

  private inlineResourcesFor(provider: IntegrationProvider): SyncResource[] {
    if (provider === IntegrationProvider.google) {
      return [SyncResource.email, SyncResource.calendar, SyncResource.tasks];
    }
    if (provider === IntegrationProvider.microsoft) {
      return [SyncResource.email, SyncResource.calendar];
    }
    if (provider === IntegrationProvider.slack) {
      return [SyncResource.messages];
    }
    if (
      provider === IntegrationProvider.github ||
      provider === IntegrationProvider.notion
    ) {
      return [SyncResource.tasks];
    }
    return [];
  }

  private async requireAccount(
    user: AuthUser,
    connectedAccountId: string,
    workspaceId: string,
  ) {
    await this.membership.requireMembership(user.id, workspaceId);
    const account = await this.prisma.connectedAccount.findFirst({
      where: {
        id: connectedAccountId,
        workspaceId,
        status: { not: ConnectedAccountStatus.revoked },
      },
    });
    if (!account) {
      throw new NotFoundException('Connected account not found');
    }
    return account;
  }
}
