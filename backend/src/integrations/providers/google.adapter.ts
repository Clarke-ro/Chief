import { Injectable } from '@nestjs/common';
import { IntegrationProvider } from '@prisma/client';
import { AppConfigService } from '../../common/config/app-config.service';
import { ProviderAdapter } from './provider.adapter';
import { fetchJson, parseExpiresIn, splitScopes } from './oauth-http';
import type {
  AuthorizationParams,
  ExchangeCodeParams,
  OAuthTokenSet,
  ProviderAccountProfile,
  ProviderDefinition,
  ProviderHealthResult,
} from './provider.types';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/tasks',
];

@Injectable()
export class GoogleAdapter extends ProviderAdapter {
  readonly definition: ProviderDefinition = {
    id: IntegrationProvider.google,
    displayName: 'Google',
    description: 'Gmail, Google Calendar, Google Tasks, and Drive',
    capabilities: ['gmail', 'calendar', 'tasks', 'drive'],
    scopes: SCOPES,
    supportsRefresh: true,
    supportsRevoke: true,
  };

  constructor(private readonly config: AppConfigService) {
    super();
  }

  isConfigured(): boolean {
    const { clientId, clientSecret } = this.config.oauth.google;
    return Boolean(clientId && clientSecret);
  }

  getAuthorizationUrl(params: AuthorizationParams): string {
    const { clientId } = this.requireCredentials();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES.join(' '));
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return url.toString();
  }

  async exchangeCode(params: ExchangeCodeParams): Promise<OAuthTokenSet> {
    const { clientId, clientSecret } = this.requireCredentials();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    });

    const token = await fetchJson<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    }>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: token.token_type,
      expiresAt: parseExpiresIn(token.expires_in),
      scope: splitScopes(token.scope),
      raw: token as unknown as Record<string, unknown>,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const { clientId, clientSecret } = this.requireCredentials();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const token = await fetchJson<{
      access_token: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
      refresh_token?: string;
    }>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? refreshToken,
      tokenType: token.token_type,
      expiresAt: parseExpiresIn(token.expires_in),
      scope: splitScopes(token.scope),
    };
  }

  async fetchAccountProfile(
    accessToken: string,
  ): Promise<ProviderAccountProfile> {
    const profile = await fetchJson<{
      sub: string;
      email?: string;
      name?: string;
    }>('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      providerAccountId: profile.sub,
      email: profile.email,
      displayName: profile.name,
    };
  }

  async checkHealth(accessToken: string): Promise<ProviderHealthResult> {
    try {
      await this.fetchAccountProfile(accessToken);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Google health failed',
      };
    }
  }

  async revoke(accessToken: string): Promise<void> {
    const url = new URL('https://oauth2.googleapis.com/revoke');
    url.searchParams.set('token', accessToken);
    await fetch(url, { method: 'POST' });
  }

  private requireCredentials() {
    const creds = this.config.oauth.google;
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('Google OAuth is not configured');
    }
    return creds;
  }
}
