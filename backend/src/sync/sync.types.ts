import type { IntegrationProvider, SyncResource } from '@prisma/client';

export type SyncReason =
  | 'onboarding'
  | 'schedule'
  | 'manual'
  | 'recovery'
  | 'webhook'
  | 'historical';

export type RawSyncItem = {
  providerItemId: string;
  occurredAt?: string;
  payload: Record<string, unknown>;
};

export type RawSyncBatch = {
  workspaceId: string;
  connectedAccountId: string;
  provider: IntegrationProvider;
  resource: SyncResource;
  reason: SyncReason;
  fetchedAt: string;
  window: {
    from?: string;
    to?: string;
    mode: 'initial' | 'incremental' | 'historical';
  };
  cursorBefore?: string | null;
  cursorAfter?: string | null;
  items: RawSyncItem[];
  stub?: boolean;
  meta?: Record<string, unknown>;
};

export type SyncPolicyDefinition = {
  provider: IntegrationProvider;
  resource: SyncResource;
  initialLookbackDays: number;
  initialLookaheadDays?: number;
  scheduledIntervalMinutes: number;
  allowAutomaticHistorical: false;
};

export type SyncWindowPlan = {
  from: Date;
  to: Date;
  mode: 'initial' | 'incremental' | 'historical';
  lookbackDays: number;
  lookaheadDays: number;
};

export type FetchContext = {
  workspaceId: string;
  connectedAccountId: string;
  provider: IntegrationProvider;
  resource: SyncResource;
  reason: SyncReason;
  accessToken: string;
  cursor: string | null;
  window: SyncWindowPlan;
};

export type SyncResourceFetcher = {
  provider: IntegrationProvider;
  resource: SyncResource;
  fetch: (ctx: FetchContext) => Promise<RawSyncBatch>;
};
