import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { BackendIntegrationProvider } from '@/config/integrations/providerMap';
import { ensureActiveWorkspaceId, isWorkspaceUuid } from '@/services/activeWorkspace';
import { ApiError } from '@/services/api/client';
import { agentLog } from '@/services/debugAgentLog';
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
    // #region agent log
    agentLog('D', 'connectIntegration.ts:resolveWorkspace', 'workspace resolved', {
      provider,
      passedWorkspace: workspaceId ?? null,
      resolvedWorkspaceId,
      passedIsValid: Boolean(workspaceId && isWorkspaceUuid(workspaceId)),
    });
    // #endregion
  } catch (error) {
    // #region agent log
    agentLog('D', 'connectIntegration.ts:resolveFail', 'workspace resolve failed', {
      provider,
      passedWorkspace: workspaceId ?? null,
      errorMessage: error instanceof Error ? error.message : 'unknown',
    });
    // #endregion
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
    // #region agent log
    agentLog(
      'G',
      'connectIntegration.ts:connectApi',
      'connect api ok with returnTo',
      {
        provider,
        hasAuthorizeUrl: Boolean(authorizeUrl),
        returnTo: redirectUrl,
        authorizeHost: (() => {
          try {
            return new URL(authorizeUrl).host;
          } catch {
            return null;
          }
        })(),
      },
      'post-fix',
    );
    // #endregion
  } catch (error) {
    // #region agent log
    agentLog('F', 'connectIntegration.ts:connectApiFail', 'connect api failed', {
      provider,
      status: error instanceof ApiError ? error.status : null,
      message: error instanceof Error ? error.message : 'unknown',
    });
    // #endregion
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

  // #region agent log
  agentLog(
    'G',
    'connectIntegration.ts:openBrowser',
    'opening auth session',
    {
      provider,
      redirectUrl,
    },
    'post-fix',
  );
  // #endregion

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUrl);
  // #region agent log
  agentLog(
    'C',
    'connectIntegration.ts:browserResult',
    'auth session result',
    {
      provider,
      resultType: result?.type ?? null,
      hasUrl: Boolean(result && 'url' in result && result.url),
      urlScheme: (() => {
        try {
          if (result && 'url' in result && typeof result.url === 'string') {
            return new URL(result.url).protocol;
          }
        } catch {
          return null;
        }
        return null;
      })(),
    },
    'post-fix',
  );
  // #endregion

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

  // Deep link may have failed (invalid chief://) but OAuth can still succeed server-side.
  const connectedAfterReturn = await isProviderConnected(provider, resolvedWorkspaceId);
  // #region agent log
  agentLog(
    'D',
    'connectIntegration.ts:fallbackCheck',
    'checked connection after non-success browser result',
    {
      provider,
      resultType: result?.type ?? null,
      connectedAfterReturn,
    },
    'post-fix',
  );
  // #endregion
  if (connectedAfterReturn) {
    return { ok: true, provider };
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, reason: 'cancelled' };
  }

  return { ok: false, reason: 'failed', message: 'OAuth session did not complete.' };
}
