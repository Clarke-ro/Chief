import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedAccountStatus,
  SyncResource,
  SyncRunStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccessTokenService } from '../../integrations/tokens/access-token.service';
import { SyncFetcherRegistry } from '../fetch/sync-fetcher.registry';
import { SyncPersistService } from '../persist/sync-persist.service';
import { SyncPolicyService } from '../policies/sync-policy.service';
import { GoogleApiError } from '../providers/google';
import type { SyncReason } from '../sync.types';

@Injectable()
export class SyncPipelineService {
  private readonly logger = new Logger(SyncPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AccessTokenService,
    private readonly policies: SyncPolicyService,
    private readonly fetchers: SyncFetcherRegistry,
    private readonly persist: SyncPersistService,
  ) {}

  async runResourceJob(input: {
    workspaceId: string;
    connectedAccountId: string;
    resource: SyncResource;
    reason: SyncReason;
    historicalLookbackDays?: number;
  }): Promise<{ itemCount: number; stub: boolean }> {
    const account = await this.prisma.connectedAccount.findFirst({
      where: {
        id: input.connectedAccountId,
        workspaceId: input.workspaceId,
        status: ConnectedAccountStatus.active,
      },
    });
    if (!account) {
      throw new Error(
        `Active connected account not found: ${input.connectedAccountId}`,
      );
    }

    const policy = this.policies.get(account.provider, input.resource);
    if (!policy) {
      this.logger.warn(
        { provider: account.provider, resource: input.resource },
        'No sync policy for provider/resource — skipping',
      );
      return { itemCount: 0, stub: true };
    }

    if (input.reason !== 'historical' && input.historicalLookbackDays != null) {
      throw new Error('historicalLookbackDays is only valid for historical sync');
    }

    const state = await this.prisma.syncState.upsert({
      where: {
        connectedAccountId_resource: {
          connectedAccountId: account.id,
          resource: input.resource,
        },
      },
      create: {
        workspaceId: account.workspaceId,
        connectedAccountId: account.id,
        resource: input.resource,
        status: SyncRunStatus.running,
      },
      update: {
        status: SyncRunStatus.running,
        lastError: null,
      },
    });

    const window = this.policies.planWindow({
      policy,
      reason: input.reason,
      hasCursor: Boolean(state.cursor),
      historicalLookbackDays: input.historicalLookbackDays,
    });

    const fetcher = this.fetchers.get(account.provider, input.resource);
    if (!fetcher) {
      await this.failState(state.id, 'No fetcher registered');
      throw new Error(`No fetcher for ${account.provider}/${input.resource}`);
    }

    try {
      const accessToken = await this.tokens.getValidAccessToken(account.id);
      const batch = await fetcher.fetch({
        workspaceId: account.workspaceId,
        connectedAccountId: account.id,
        provider: account.provider,
        resource: input.resource,
        reason: input.reason,
        accessToken,
        cursor: state.cursor,
        window,
      });

      await this.persist.accept(batch);

      await this.prisma.syncState.update({
        where: { id: state.id },
        data: {
          status: SyncRunStatus.succeeded,
          cursor: batch.cursorAfter ?? state.cursor,
          lastSyncedAt: new Date(),
          lastError: null,
          meta: {
            lastReason: input.reason,
            lastMode: batch.window.mode,
            lastItemCount: batch.items.length,
            stub: batch.stub ?? false,
            fetchedAt: batch.fetchedAt,
          },
        },
      });

      return {
        itemCount: batch.items.length,
        stub: batch.stub ?? false,
      };
    } catch (error) {
      const message =
        error instanceof GoogleApiError
          ? `${error.message}${error.bodySnippet ? `: ${error.bodySnippet}` : ''}`
          : error instanceof Error
            ? error.message
            : 'sync_failed';

      if (error instanceof GoogleApiError && error.status === 401) {
        this.logger.warn(
          {
            connectedAccountId: input.connectedAccountId,
            resource: input.resource,
          },
          'Provider token rejected during fetch — reauth likely required',
        );
      }

      await this.failState(state.id, message);
      throw error;
    }
  }

  private async failState(stateId: string, message: string) {
    await this.prisma.syncState.update({
      where: { id: stateId },
      data: {
        status: SyncRunStatus.failed,
        lastError: message.slice(0, 1000),
      },
    });
  }
}

export function parseSyncResource(value?: string): SyncResource | null {
  if (!value) return null;
  if (Object.values(SyncResource).includes(value as SyncResource)) {
    return value as SyncResource;
  }
  return null;
}
