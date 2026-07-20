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

  let authorizeUrl: string;
  try {
    ({ authorizeUrl } = await integrationsRepository.connect(provider, resolvedWorkspaceId));
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
