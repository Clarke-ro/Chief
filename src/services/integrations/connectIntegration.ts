import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { BackendIntegrationProvider } from '@/config/integrations/providerMap';
import { ensureActiveWorkspaceId, isWorkspaceUuid } from '@/services/activeWorkspace';
import { ApiError } from '@/services/api/client';
import { getIntegrationReturnTo } from '@/services/integrations/integrationReturnTo';
import { integrationsRepository } from '@/services/repositories/integrationsRepository';

export type OAuthIntegrationResult =
  | { ok: true; provider: BackendIntegrationProvider }
  | { ok: false; reason: 'cancelled' | 'failed'; message?: string };

export type OAuthIntegrationOptions = {
  /** In-app path to open after OAuth callback (web full-page return). */
  next?: string;
};

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

async function resolveWorkspace(workspaceId?: string): Promise<string | null> {
  try {
    if (workspaceId && isWorkspaceUuid(workspaceId)) return workspaceId;
    return await ensureActiveWorkspaceId();
  } catch {
    return null;
  }
}

function mapOAuthStartError(error: unknown): OAuthIntegrationResult {
  if (error instanceof ApiError && error.status === 401) {
    return {
      ok: false,
      reason: 'failed',
      message: 'Your session expired. Sign in again and retry.',
    };
  }
  if (error instanceof ApiError && error.status === 400) {
    const server = (error.serverMessage ?? error.message).toLowerCase();
    if (server.includes('oauth') && server.includes('not configured')) {
      return {
        ok: false,
        reason: 'failed',
        message: 'This app is not configured on the server yet.',
      };
    }
    return {
      ok: false,
      reason: 'failed',
      message: 'Workspace is not ready yet. Pull to refresh and try again.',
    };
  }
  if (error instanceof ApiError && error.status === 503) {
    return {
      ok: false,
      reason: 'failed',
      message: 'This app is not configured on the server yet.',
    };
  }
  return {
    ok: false,
    reason: 'failed',
    message: 'Could not start OAuth. Check your connection and try again.',
  };
}

async function completeBrowserOAuth(
  authorizeUrl: string,
  redirectUrl: string,
  provider: BackendIntegrationProvider,
  workspaceId: string,
): Promise<OAuthIntegrationResult> {
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
  const connectedAfterReturn = await isProviderConnected(provider, workspaceId);
  if (connectedAfterReturn) {
    return { ok: true, provider };
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, reason: 'cancelled' };
  }

  return { ok: false, reason: 'failed', message: 'OAuth session did not complete.' };
}

/**
 * Opens the provider OAuth page and waits for the app callback.
 * Web: HTTPS returnTo on the current origin (Vercel). Native: chief:// / exp://.
 */
export async function connectIntegration(
  provider: BackendIntegrationProvider,
  workspaceId?: string,
  options?: OAuthIntegrationOptions,
): Promise<OAuthIntegrationResult> {
  const resolvedWorkspaceId = await resolveWorkspace(workspaceId);
  if (!resolvedWorkspaceId) {
    return {
      ok: false,
      reason: 'failed',
      message: 'Could not load your workspace. Sign in again and retry.',
    };
  }

  const redirectUrl = getIntegrationReturnTo(options?.next);

  let authorizeUrl: string;
  try {
    const connectResponse = await integrationsRepository.connect(
      provider,
      resolvedWorkspaceId,
      redirectUrl,
    );
    authorizeUrl = connectResponse.authorizeUrl;
  } catch (error) {
    return mapOAuthStartError(error);
  }

  return completeBrowserOAuth(authorizeUrl, redirectUrl, provider, resolvedWorkspaceId);
}

/**
 * Re-authorize an existing connection (expired / needs_reauth).
 * Uses POST /integrations/:id/reconnect so the server links the new tokens
 * to the same ConnectedAccount row.
 */
export async function reconnectIntegration(
  connectedAccountId: string,
  provider: BackendIntegrationProvider,
  workspaceId?: string,
  options?: OAuthIntegrationOptions,
): Promise<OAuthIntegrationResult> {
  const resolvedWorkspaceId = await resolveWorkspace(workspaceId);
  if (!resolvedWorkspaceId) {
    return {
      ok: false,
      reason: 'failed',
      message: 'Could not load your workspace. Sign in again and retry.',
    };
  }

  const redirectUrl = getIntegrationReturnTo(options?.next);

  let authorizeUrl: string;
  try {
    const reconnectResponse = await integrationsRepository.reconnect(
      connectedAccountId,
      resolvedWorkspaceId,
      redirectUrl,
    );
    authorizeUrl = reconnectResponse.authorizeUrl;
  } catch (error) {
    return mapOAuthStartError(error);
  }

  return completeBrowserOAuth(authorizeUrl, redirectUrl, provider, resolvedWorkspaceId);
}

/** @deprecated Use OAuthIntegrationResult */
export type ConnectIntegrationResult = OAuthIntegrationResult;
/** @deprecated Use OAuthIntegrationOptions */
export type ConnectIntegrationOptions = OAuthIntegrationOptions;
