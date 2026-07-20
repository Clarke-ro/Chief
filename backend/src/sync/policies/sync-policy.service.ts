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
    hasCursor: boolean;
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

    if (!input.hasCursor || input.reason === 'onboarding') {
      return {
        from: daysAgo(now, input.policy.initialLookbackDays),
        to: daysAhead(now, lookaheadDays),
        mode: 'initial',
        lookbackDays: input.policy.initialLookbackDays,
        lookaheadDays,
      };
    }

    return {
      from: daysAgo(now, 1),
      to: daysAhead(now, lookaheadDays || 1),
      mode: 'incremental',
      lookbackDays: 1,
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
