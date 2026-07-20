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
  'offline_access',
  'openid',
  'profile',
  'email',
  'User.Read',
  'Mail.Read',
  'Mail.ReadWrite',
  'Calendars.ReadWrite',
  'Files.Read',
];

@Injectable()
export class MicrosoftAdapter extends ProviderAdapter {
  readonly definition: ProviderDefinition = {
    id: IntegrationProvider.microsoft,
    displayName: 'Microsoft',
    description: 'Outlook, Microsoft Calendar, and OneDrive',
    capabilities: ['outlook', 'calendar', 'onedrive'],
    scopes: SCOPES,
    supportsRefresh: true,
    supportsRevoke: false,
  };

  constructor(private readonly config: AppConfigService) {
    super();
  }

  isConfigured(): boolean {
    const { clientId, clientSecret } = this.config.oauth.microsoft;
    return Boolean(clientId && clientSecret);
  }

  getAuthorizationUrl(params: AuthorizationParams): string {
    const { clientId, tenantId } = this.requireCredentials();
    const url = new URL(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    );
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', SCOPES.join(' '));
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('prompt', 'consent');
    return url.toString();
  }

  async exchangeCode(params: ExchangeCodeParams): Promise<OAuthTokenSet> {
    const { clientId, clientSecret, tenantId } = this.requireCredentials();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: params.codeVerifier,
      scope: SCOPES.join(' '),
    });

    const token = await fetchJson<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    }>(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenType: token.token_type,
      expiresAt: parseExpiresIn(token.expires_in),
      scope: splitScopes(token.scope),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const { clientId, clientSecret, tenantId } = this.requireCredentials();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: SCOPES.join(' '),
    });

    const token = await fetchJson<{
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    }>(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

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
    const me = await fetchJson<{
      id: string;
      displayName?: string;
      mail?: string;
      userPrincipalName?: string;
    }>('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      providerAccountId: me.id,
      email: me.mail ?? me.userPrincipalName,
      displayName: me.displayName,
    };
  }

  async checkHealth(accessToken: string): Promise<ProviderHealthResult> {
    try {
      await this.fetchAccountProfile(accessToken);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Microsoft health failed',
      };
    }
  }

  private requireCredentials() {
    const creds = this.config.oauth.microsoft;
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('Microsoft OAuth is not configured');
    }
    return {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      tenantId: creds.tenantId || 'common',
    };
  }
}
