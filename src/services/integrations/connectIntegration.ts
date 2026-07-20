import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { BackendIntegrationProvider } from '@/config/integrations/providerMap';
import { integrationsRepository } from '@/services/repositories/integrationsRepository';

export type ConnectIntegrationResult =
  | { ok: true; provider: BackendIntegrationProvider }
  | { ok: false; reason: 'cancelled' | 'failed'; message?: string };

const APP_CALLBACK_PATH = 'integrations/callback';

/**
 * Opens the provider OAuth page and waits for the app deep link callback.
 */
export async function connectIntegration(
  provider: BackendIntegrationProvider,
  workspaceId: string,
): Promise<ConnectIntegrationResult> {
  const { authorizeUrl } = await integrationsRepository.connect(provider, workspaceId);
  const redirectUrl = Linking.createURL(APP_CALLBACK_PATH);

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUrl);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, reason: 'cancelled' };
  }

  if (result.type !== 'success') {
    return { ok: false, reason: 'failed', message: 'OAuth session did not complete.' };
  }

  const parsed = Linking.parse(result.url);
  const status = typeof parsed.queryParams?.status === 'string' ? parsed.queryParams.status : null;
  if (status === 'error') {
    const reason =
      typeof parsed.queryParams?.reason === 'string'
        ? parsed.queryParams.reason
        : 'Integration connect failed.';
    return { ok: false, reason: 'failed', message: reason };
  }

  return { ok: true, provider };
}
