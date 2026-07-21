import { Injectable } from '@nestjs/common';
import {
  IntegrationProvider,
  SyncResource,
  SyncRunStatus,
} from '@prisma/client';
import type { SyncPolicyDefinition, SyncReason, SyncWindowPlan } from '../sync.types';
import {
  CAPABILITY_TO_RESOURCE,
  findPolicy,
  policiesForProvider,
} from './sync-policies';

const DEFAULT_INCREMENTAL_LOOKBACK_MINUTES = 30;

@Injectable()
export class SyncPolicyService {
  listForProvider(provider: IntegrationProvider) {
    return policiesForProvider(provider);
  }

  get(provider: IntegrationProvider, resource: SyncResource) {
    return findPolicy(provider, resource);
  }

  resourcesForCapabilities(
    provider: IntegrationProvider,
    capabilities: string[],
  ): SyncResource[] {
    const allowed = new Set(
      this.listForProvider(provider).map((p) => p.resource),
    );
    const resources = new Set<SyncResource>();
    for (const capability of capabilities) {
      const resource = CAPABILITY_TO_RESOURCE[capability];
      if (resource && allowed.has(resource)) {
        resources.add(resource);
      }
    }
    return [...resources];
  }

  planWindow(input: {
    policy: SyncPolicyDefinition;
    reason: SyncReason;
    /** True after at least one successful sync for this account+resource. */
    hasPriorSync: boolean;
    historicalLookbackDays?: number;
  }): SyncWindowPlan {
    const now = new Date();
    const lookaheadDays = input.policy.initialLookaheadDays ?? 0;

    if (input.reason === 'historical') {
      const lookbackDays = Math.max(
        1,
        input.historicalLookbackDays ?? input.policy.initialLookbackDays,
      );
      return {
        from: daysAgo(now, lookbackDays),
        to: daysAhead(now, lookaheadDays),
        mode: 'historical',
        lookbackDays,
        lookaheadDays,
      };
    }

    // First sync / onboarding / recovery: full initial lookback only.
    // Manual + schedule after a prior sync use the incremental window so we
    // do not re-scrape the whole mailbox/calendar on every Home refresh.
    const needsInitial =
      !input.hasPriorSync ||
      input.reason === 'onboarding' ||
      input.reason === 'recovery';

    if (needsInitial) {
      return {
        from: daysAgo(now, input.policy.initialLookbackDays),
        to: daysAhead(now, lookaheadDays),
        mode: 'initial',
        lookbackDays: input.policy.initialLookbackDays,
        lookaheadDays,
      };
    }

    const lookbackMinutes =
      input.policy.incrementalLookbackMinutes ??
      DEFAULT_INCREMENTAL_LOOKBACK_MINUTES;

    return {
      from: minutesAgo(now, lookbackMinutes),
      // Keep calendar/task lookahead so upcoming items stay in the scrape.
      to: daysAhead(now, lookaheadDays || 1),
      mode: 'incremental',
      lookbackDays: 0,
      lookbackMinutes,
      lookaheadDays: lookaheadDays || 1,
    };
  }

  isDue(input: {
    policy: SyncPolicyDefinition;
    lastSyncedAt: Date | null;
    status: SyncRunStatus;
  }): boolean {
    if (input.status === SyncRunStatus.running) return false;
    if (!input.lastSyncedAt) return true;
    const elapsedMs = Date.now() - input.lastSyncedAt.getTime();
    return elapsedMs >= input.policy.scheduledIntervalMinutes * 60_000;
  }
}

function daysAgo(from: Date, days: number) {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}

function daysAhead(from: Date, days: number) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

function minutesAgo(from: Date, minutes: number) {
  return new Date(from.getTime() - minutes * 60 * 1000);
}
