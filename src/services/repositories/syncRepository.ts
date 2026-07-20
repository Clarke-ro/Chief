import { apiJson } from '@/services/api/client';

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
};
