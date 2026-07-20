import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { BackendIntegrationProvider } from '@/config/integrations/providerMap';
import { ensureActiveWorkspaceId, isWorkspaceUuid } from '@/services/activeWorkspace';
import { ApiError } from '@/services/api/client';
import { integrationsRepository } from '@/services/repositories/integrationsRepository';

export type ConnectIntegrationResult =
  | { ok: true; provider: BackendIntegrationProvider }
  | { ok: false; reason: 'cancelled' | 'failed'; message?: string };

const APP_CALLBACK_PATH = 'integrations/callback';

async function isProviderConnected(
  provider: BackendIntegrationProvider,
  workspaceId: string,
): Promise<boolean> {
  try {
    const list = await integrationsRepository.list(workspaceId);
    return list.connections.some(
      (c) => c.provider === provider && c.status !== 'revoked',
    );
  } catch {
    return false;
  }
}

/**
 * Opens the provider OAuth page and waits for the app deep link callback.
 */
export async function connectIntegration(
  provider: BackendIntegrationProvider,
  workspaceId?: string,
): Promise<ConnectIntegrationResult> {
  let resolvedWorkspaceId: string;
  try {
    resolvedWorkspaceId =
      workspaceId && isWorkspaceUuid(workspaceId) ? workspaceId : await ensureActiveWorkspaceId();
  } catch {
    return {
      ok: false,
      reason: 'failed',
      message: 'Could not load your workspace. Sign in again and retry.',
    };
  }

  const redirectUrl = Linking.createURL(APP_CALLBACK_PATH);

  let authorizeUrl: string;
  try {
    const connectResponse = await integrationsRepository.connect(
      provider,
      resolvedWorkspaceId,
      redirectUrl,
    );
    authorizeUrl = connectResponse.authorizeUrl;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return {
        ok: false,
        reason: 'failed',
        message: 'Your session expired. Sign in again and retry.',
      };
    }
    if (error instanceof ApiError && error.status === 400) {
      return {
        ok: false,
        reason: 'failed',
        message: 'Workspace is not ready yet. Pull to refresh and try again.',
      };
    }
    return {
      ok: false,
      reason: 'failed',
      message: 'Could not start OAuth. Check your connection and try again.',
    };
  }

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUrl);

  if (result.type === 'success') {
    const parsed = Linking.parse(result.url);
    const status =
      typeof parsed.queryParams?.status === 'string' ? parsed.queryParams.status : null;
    if (status === 'error') {
      const reason =
        typeof parsed.queryParams?.reason === 'string'
          ? parsed.queryParams.reason
          : 'Integration connect failed.';
      return { ok: false, reason: 'failed', message: reason };
    }
    return { ok: true, provider };
  }

  // Deep link may fail; OAuth can still succeed server-side — confirm via API.
  const connectedAfterReturn = await isProviderConnected(provider, resolvedWorkspaceId);
  if (connectedAfterReturn) {
    return { ok: true, provider };
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, reason: 'cancelled' };
  }

  return { ok: false, reason: 'failed', message: 'OAuth session did not complete.' };
}
