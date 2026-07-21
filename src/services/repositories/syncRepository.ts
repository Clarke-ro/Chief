import { apiJson } from '@/services/api/client';

export type SyncStateRow = {
  resource: string;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type SyncStatusResponse = {
  connectedAccountId: string;
  provider: string;
  states: SyncStateRow[];
};

export type SyncFreshnessResponse = {
  workspaceId: string;
  lastSyncedAt: string | null;
  syncing: boolean;
  failed: boolean;
  lastError: string | null;
  resourceCount: number;
};

export const syncRepository = {
  run(connectedAccountId: string, workspaceId: string, resource?: string) {
    return apiJson<{ ok: boolean; jobName?: string }>(
      `/v1/sync/accounts/${connectedAccountId}/run`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          ...(resource ? { resource } : {}),
        }),
      },
    );
  },

  getStatus(connectedAccountId: string, workspaceId: string) {
    const query = new URLSearchParams({ workspaceId });
    return apiJson<SyncStatusResponse>(
      `/v1/sync/accounts/${connectedAccountId}?${query.toString()}`,
    );
  },

  getFreshness(workspaceId: string) {
    const query = new URLSearchParams({ workspaceId });
    return apiJson<SyncFreshnessResponse>(`/v1/sync/freshness?${query.toString()}`);
  },

  /**
   * Kick sync for every active connection (Google + Slack/GitHub/Notion).
   * Returns how many accounts were triggered.
   */
  async runAllConnections(workspaceId: string): Promise<number> {
    const { integrationsRepository } = await import(
      '@/services/repositories/integrationsRepository'
    );
    const list = await integrationsRepository.list(workspaceId);
    const accounts = list.connections.filter((c) => c.status !== 'revoked');
    if (accounts.length === 0) return 0;

    // Prefer Google first so Home brief fills quickly, then other providers.
    const ordered = [
      ...accounts.filter((c) => c.provider === 'google'),
      ...accounts.filter((c) => c.provider !== 'google'),
    ];

    let triggered = 0;
    for (const account of ordered) {
      try {
        await syncRepository.run(account.id, workspaceId);
        triggered += 1;
      } catch {
        // Continue other providers — one failure shouldn't block the rest.
      }
    }
    return triggered;
  },

  /** Kick sync for the first active Google (or any) connection. */
  async runFirstConnection(workspaceId: string): Promise<boolean> {
    const count = await syncRepository.runAllConnections(workspaceId);
    return count > 0;
  },

  /**
   * Prepare workspace during onboarding: run initial sync, then poll until
   * resources succeed (or timeout). Returns the primary account id if any.
   * `onProgress` reports real sync fraction so UI meters can match the worker.
   */
  async prepareWorkspace(
    workspaceId: string,
    opts?: {
      timeoutMs?: number;
      pollMs?: number;
      onProgress?: (update: { progress: number; label: string }) => void;
    },
  ): Promise<{ ready: boolean; accountId: string | null }> {
    const timeoutMs = opts?.timeoutMs ?? 90_000;
    const pollMs = opts?.pollMs ?? 2_000;
    const onProgress = opts?.onProgress;
    const { integrationsRepository } = await import(
      '@/services/repositories/integrationsRepository'
    );
    const list = await integrationsRepository.list(workspaceId);
    const account =
      list.connections.find((c) => c.provider === 'google' && c.status !== 'revoked') ??
      list.connections.find((c) => c.status !== 'revoked');
    if (!account) {
      onProgress?.({ progress: 0, label: 'No apps connected yet' });
      return { ready: false, accountId: null };
    }

    onProgress?.({ progress: 0.08, label: 'Starting sync…' });
    try {
      await syncRepository.runAllConnections(workspaceId);
      onProgress?.({ progress: 0.18, label: 'Syncing connected apps…' });
    } catch {
      // Still poll — OAuth onboarding sync may already be running.
      onProgress?.({ progress: 0.15, label: 'Waiting for sync…' });
    }

    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      try {
        const status = await syncRepository.getStatus(account.id, workspaceId);
        const states = status.states ?? [];
        if (states.length === 0) {
          onProgress?.({ progress: 0.22, label: 'Connecting to your apps…' });
          await sleep(pollMs);
          continue;
        }
        const done = states.filter(
          (s) => s.status === 'succeeded' || s.status === 'failed',
        ).length;
        const running = states.some((s) => s.status === 'running');
        const fraction = done / states.length;
        // Cap sync phase at 0.82 so brief compose can finish the bar.
        const progress = 0.2 + fraction * 0.62;
        const runningResource = states.find((s) => s.status === 'running')?.resource;
        onProgress?.({
          progress,
          label: runningResource
            ? `Syncing ${runningResource}…`
            : running
              ? 'Pulling mail, calendar, and tasks…'
              : 'Scoring what deserves attention…',
        });
        const anySuccess = states.some(
          (s) => s.status === 'succeeded' && s.lastSyncedAt,
        );
        if (!running && anySuccess) {
          onProgress?.({ progress: 0.85, label: 'Sync finished' });
          return { ready: true, accountId: account.id };
        }
      } catch {
        // keep polling
      }
      await sleep(pollMs);
    }

    onProgress?.({ progress: 0.85, label: 'Taking longer than usual…' });
    return { ready: false, accountId: account.id };
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
