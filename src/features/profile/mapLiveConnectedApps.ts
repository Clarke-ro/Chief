import type { PlatformIconId } from '@/components/ui';
import type { BackendIntegrationProvider } from '@/config/integrations/providerMap';
import type { ConnectedApp } from '@/features/profile/types';
import type { IntegrationConnection } from '@/services/repositories/integrationsRepository';

/** Profile manage grid — only apps with a live OAuth provider. */
export const PROFILE_MANAGE_APPS: ReadonlyArray<{
  id: string;
  platform: PlatformIconId;
  name: string;
  provider: BackendIntegrationProvider;
}> = [
  { id: 'gmail', platform: 'gmail', name: 'Gmail', provider: 'google' },
  { id: 'calendar', platform: 'calendar', name: 'Google Calendar', provider: 'google' },
  { id: 'slack', platform: 'slack', name: 'Slack', provider: 'slack' },
  { id: 'github', platform: 'github', name: 'GitHub', provider: 'github' },
  { id: 'notion', platform: 'notion', name: 'Notion', provider: 'notion' },
];

export function mapLiveConnectedApps(
  connections: IntegrationConnection[] | undefined,
): ConnectedApp[] {
  const byProvider = new Map<string, IntegrationConnection>();
  for (const connection of connections ?? []) {
    if (connection.status === 'revoked') continue;
    // Prefer the newest connection per provider.
    const existing = byProvider.get(connection.provider);
    if (!existing || connection.connectedAt > existing.connectedAt) {
      byProvider.set(connection.provider, connection);
    }
  }

  return PROFILE_MANAGE_APPS.map((app) => {
    const connection = byProvider.get(app.provider);
    return {
      id: app.id,
      platform: app.platform,
      name: app.name,
      connected: Boolean(connection),
      connectionId: connection?.id,
      provider: app.provider,
      needsReauth: connection?.needsReauth ?? false,
      accountLabel: connection?.email ?? connection?.displayName ?? null,
    };
  });
}
