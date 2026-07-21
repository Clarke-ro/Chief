import { authClient } from '@/services/auth/authClient';
import type { MeResponse } from '@/services/auth/types';
import { apiJson } from '@/services/api/client';
import { authSession } from '@/services/api/authSession';
import { persistActiveWorkspaceId } from '@/services/activeWorkspace';

export class AuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

type AuthTokenPayload = {
  token?: string | null;
};

function extractToken(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as AuthTokenPayload & {
    session?: { token?: string | null };
  };
  if (typeof record.token === 'string' && record.token.length > 0) {
    return record.token;
  }
  const sessionToken = record.session?.token;
  return typeof sessionToken === 'string' && sessionToken.length > 0 ? sessionToken : null;
}

async function syncBearerFromSession(): Promise<void> {
  const session = await authClient.getSession();
  await persistBearerToken(session.data);
}

async function persistBearerToken(payload: unknown): Promise<void> {
  const token = extractToken(payload);
  if (token) {
    await authSession.setTokens({ accessToken: token });
  }
}

function formatAuthError(error: unknown): string {
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return 'Authentication failed. Check your credentials and try again.';
}

export const authService = {
  async signIn(email: string, password: string): Promise<MeResponse> {
    const trimmedEmail = email.trim();
    const result = await authClient.signIn.email({
      email: trimmedEmail,
      password,
    });

    if (result.error) {
      throw new AuthServiceError(formatAuthError(result.error));
    }

    await persistBearerToken(result.data);

    try {
      await syncBearerFromSession();
      return await authService.bootstrapSession();
    } catch (error) {
      // Cookie/session cache can lag on first write — bearer from sign-in response is enough.
      if (await authSession.getAccessToken()) {
        return await apiJson<MeResponse>('/v1/me').then((me) => {
          const primary = me.workspaces[0];
          if (primary) persistActiveWorkspaceId(primary.id);
          return me;
        });
      }
      throw error instanceof AuthServiceError
        ? error
        : new AuthServiceError(formatAuthError(error));
    }
  },

  async signUp(input: { email: string; password: string; name?: string }): Promise<MeResponse> {
    const trimmedEmail = input.email.trim();
    const name = input.name?.trim() || trimmedEmail.split('@')[0] || 'Chief user';

    const result = await authClient.signUp.email({
      email: trimmedEmail,
      password: input.password,
      name,
    });

    if (result.error) {
      throw new AuthServiceError(formatAuthError(result.error));
    }

    await persistBearerToken(result.data);

    try {
      await syncBearerFromSession();
      return await authService.bootstrapSession();
    } catch (error) {
      if (await authSession.getAccessToken()) {
        return await apiJson<MeResponse>('/v1/me').then((me) => {
          const primary = me.workspaces[0];
          if (primary) persistActiveWorkspaceId(primary.id);
          return me;
        });
      }
      throw error instanceof AuthServiceError
        ? error
        : new AuthServiceError(formatAuthError(error));
    }
  },

  async signOut(): Promise<void> {
    try {
      await authClient.signOut();
    } catch {
      // Local wipe still runs even if remote sign-out fails.
    }
    await authSession.clear();
  },

  async restoreSession(): Promise<MeResponse | null> {
    // Prefer Better Auth cookie/session cache when durable storage still has it.
    try {
      const session = await authClient.getSession();
      if (session.data?.session) {
        const token = extractToken(session.data);
        if (token) {
          await authSession.setTokens({ accessToken: token });
        }
        return await authService.bootstrapSession();
      }
    } catch {
      // Fall through to bearer-only restore.
    }

    // Bearer-only: access token survived refresh even if cookie cache did not.
    const bearer = await authSession.getAccessToken();
    if (!bearer) {
      return null;
    }

    try {
      const me = await apiJson<MeResponse>('/v1/me');
      const primary = me.workspaces[0];
      if (primary) {
        persistActiveWorkspaceId(primary.id);
      }
      return me;
    } catch {
      await authSession.clear();
      return null;
    }
  },

  async bootstrapSession(): Promise<MeResponse> {
    const session = await authClient.getSession();
    const bearer = await authSession.getAccessToken();
    if (!session.data?.session && !bearer) {
      throw new AuthServiceError('Not signed in.');
    }

    if (session.data?.session) {
      await syncBearerFromSession();
    }

    const me = await apiJson<MeResponse>('/v1/me');
    const primary = me.workspaces[0];
    if (primary) {
      persistActiveWorkspaceId(primary.id);
    }
    return me;
  },

  /** Persist onboarding flag on the server (source of truth across devices). */
  async setOnboardingCompleted(completed: boolean): Promise<void> {
    await apiJson('/v1/me/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
  },
};
