import type { BackendIntegrationProvider } from '@/config/integrations/providerMap';
import { apiJson } from '@/services/api/client';

export type IntegrationConnection = {
  id: string;
  workspaceId: string;
  provider: BackendIntegrationProvider;
  providerAccountId: string;
  displayName: string | null;
  email: string | null;
  status: string;
  scopes: string[];
  needsReauth: boolean;
  connectedAt: string;
  health?: {
    lastCheckedAt: string | null;
    ok: boolean | null;
    message: string | null;
  };
};

export type IntegrationsListResponse = {
  workspaceId: string;
  providers: Array<{
    id: BackendIntegrationProvider;
    displayName: string;
    configured: boolean;
  }>;
  connections: IntegrationConnection[];
};

export type ConnectIntegrationResponse = {
  authorizeUrl: string;
  state: string;
};

export const integrationsRepository = {
  list(workspaceId: string): Promise<IntegrationsListResponse> {
    const query = new URLSearchParams({ workspaceId });
    return apiJson<IntegrationsListResponse>(`/v1/integrations?${query.toString()}`);
  },

  connect(
    provider: BackendIntegrationProvider,
    workspaceId: string,
    returnTo?: string,
  ): Promise<ConnectIntegrationResponse> {
    return apiJson<ConnectIntegrationResponse>(`/v1/integrations/${provider}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        ...(returnTo ? { returnTo } : {}),
      }),
    });
  },

  disconnect(connectedAccountId: string, workspaceId: string): Promise<{ ok: boolean }> {
    const query = new URLSearchParams({ workspaceId });
    return apiJson<{ ok: boolean }>(`/v1/integrations/${connectedAccountId}?${query.toString()}`, {
      method: 'DELETE',
    });
  },

  reconnect(
    connectedAccountId: string,
    workspaceId: string,
    returnTo?: string,
  ): Promise<ConnectIntegrationResponse> {
    return apiJson<ConnectIntegrationResponse>(
      `/v1/integrations/${connectedAccountId}/reconnect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          ...(returnTo ? { returnTo } : {}),
        }),
      },
    );
  },
};
