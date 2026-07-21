import { apiJson } from '@/services/api/client';

type SyncStateRow = {
  resource: string;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
};

type SyncStatusResponse = {
  connectedAccountId: string;
  provider: string;
  states: SyncStateRow[];
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

  /** Kick sync for the first active Google (or any) connection. */
  async runFirstConnection(workspaceId: string): Promise<boolean> {
    const { integrationsRepository } = await import(
      '@/services/repositories/integrationsRepository'
    );
    const list = await integrationsRepository.list(workspaceId);
    const account =
      list.connections.find((c) => c.provider === 'google' && c.status !== 'revoked') ??
      list.connections.find((c) => c.status !== 'revoked');
    if (!account) return false;
    await syncRepository.run(account.id, workspaceId);
    return true;
  },

  /**
   * Prepare workspace during onboarding: run initial sync, then poll until
   * resources succeed (or timeout). Returns the primary account id if any.
   */
  async prepareWorkspace(
    workspaceId: string,
    opts?: { timeoutMs?: number; pollMs?: number },
  ): Promise<{ ready: boolean; accountId: string | null }> {
    const timeoutMs = opts?.timeoutMs ?? 90_000;
    const pollMs = opts?.pollMs ?? 2_000;
    const { integrationsRepository } = await import(
      '@/services/repositories/integrationsRepository'
    );
    const list = await integrationsRepository.list(workspaceId);
    const account =
      list.connections.find((c) => c.provider === 'google' && c.status !== 'revoked') ??
      list.connections.find((c) => c.status !== 'revoked');
    if (!account) return { ready: false, accountId: null };

    try {
      await syncRepository.run(account.id, workspaceId);
    } catch {
      // Still poll — OAuth onboarding sync may already be running.
    }

    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      try {
        const status = await syncRepository.getStatus(account.id, workspaceId);
        const states = status.states ?? [];
        if (states.length === 0) {
          await sleep(pollMs);
          continue;
        }
        const running = states.some((s) => s.status === 'running');
        const anySuccess = states.some(
          (s) => s.status === 'succeeded' && s.lastSyncedAt,
        );
        if (!running && anySuccess) {
          return { ready: true, accountId: account.id };
        }
      } catch {
        // keep polling
      }
      await sleep(pollMs);
    }

    return { ready: false, accountId: account.id };
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
