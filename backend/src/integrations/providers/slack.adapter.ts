import { Injectable } from '@nestjs/common';
import { IntegrationProvider } from '@prisma/client';
import { AppConfigService } from '../../common/config/app-config.service';
import { ProviderAdapter } from './provider.adapter';
import { fetchJson, splitScopes } from './oauth-http';
import type {
  AuthorizationParams,
  ExchangeCodeParams,
  OAuthTokenSet,
  ProviderAccountProfile,
  ProviderDefinition,
  ProviderHealthResult,
} from './provider.types';

/** User-token scopes for reading workspace activity. */
const USER_SCOPES = [
  'channels:read',
  'groups:read',
  'im:read',
  'mpim:read',
  'users:read',
  'users:read.email',
  'search:read',
  'chat:write',
];

@Injectable()
export class SlackAdapter extends ProviderAdapter {
  readonly definition: ProviderDefinition = {
    id: IntegrationProvider.slack,
    displayName: 'Slack',
    description: 'Slack workspace messages and channels',
    capabilities: ['slack'],
    scopes: USER_SCOPES,
    supportsRefresh: true,
    supportsRevoke: true,
  };

  constructor(private readonly config: AppConfigService) {
    super();
  }

  isConfigured(): boolean {
    const { clientId, clientSecret } = this.config.oauth.slack;
    return Boolean(clientId && clientSecret);
  }

  getAuthorizationUrl(params: AuthorizationParams): string {
    const { clientId } = this.requireCredentials();
    const url = new URL('https://slack.com/oauth/v2/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('user_scope', USER_SCOPES.join(','));
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async exchangeCode(params: ExchangeCodeParams): Promise<OAuthTokenSet> {
    const { clientId, clientSecret } = this.requireCredentials();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    });

    const result = await fetchJson<{
      ok: boolean;
      error?: string;
      authed_user?: {
        id: string;
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
      };
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
      team?: { id?: string; name?: string };
    }>('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!result.ok) {
      throw new Error(result.error ?? 'Slack OAuth failed');
    }

    const userToken = result.authed_user?.access_token ?? result.access_token;
    if (!userToken) {
      throw new Error('Slack OAuth response missing access token');
    }

    const expiresIn =
      result.authed_user?.expires_in ?? result.expires_in;
    const refresh =
      result.authed_user?.refresh_token ?? result.refresh_token;
    const scope =
      result.authed_user?.scope ?? result.scope ?? USER_SCOPES.join(',');

    return {
      accessToken: userToken,
      refreshToken: refresh,
      tokenType: result.authed_user?.token_type ?? result.token_type,
      expiresAt:
        typeof expiresIn === 'number'
          ? new Date(Date.now() + expiresIn * 1000)
          : undefined,
      scope: splitScopes(scope),
      raw: result as unknown as Record<string, unknown>,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const { clientId, clientSecret } = this.requireCredentials();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const result = await fetchJson<{
      ok: boolean;
      error?: string;
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    }>('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!result.ok || !result.access_token) {
      throw new Error(result.error ?? 'Slack token refresh failed');
    }

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token ?? refreshToken,
      tokenType: result.token_type,
      expiresAt:
        typeof result.expires_in === 'number'
          ? new Date(Date.now() + result.expires_in * 1000)
          : undefined,
    };
  }

  async fetchAccountProfile(
    accessToken: string,
  ): Promise<ProviderAccountProfile> {
    const result = await fetchJson<{
      ok: boolean;
      error?: string;
      user_id?: string;
      user?: string;
      team?: string;
      team_id?: string;
    }>('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!result.ok) {
      throw new Error(result.error ?? 'Slack auth.test failed');
    }

    const userId = result.user_id ?? result.user;
    if (!userId) {
      throw new Error('Slack profile missing user id');
    }

    return {
      providerAccountId: userId,
      displayName: result.user,
      metadata: {
        teamId: result.team_id,
        team: result.team,
      },
    };
  }

  async checkHealth(accessToken: string): Promise<ProviderHealthResult> {
    try {
      await this.fetchAccountProfile(accessToken);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Slack health failed',
      };
    }
  }

  async revoke(accessToken: string): Promise<void> {
    const body = new URLSearchParams({ token: accessToken });
    const result = await fetchJson<{ ok?: boolean; error?: string }>(
      'https://slack.com/api/auth.revoke',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    if (result && result.ok === false) {
      throw new Error(result.error ?? 'Slack auth.revoke failed');
    }
  }

  private requireCredentials() {
    const creds = this.config.oauth.slack;
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('Slack OAuth is not configured');
    }
    return creds;
  }
}
