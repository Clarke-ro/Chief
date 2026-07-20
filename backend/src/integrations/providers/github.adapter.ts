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

const SCOPES = ['read:user', 'user:email', 'repo', 'read:org'];

@Injectable()
export class GitHubAdapter extends ProviderAdapter {
  readonly definition: ProviderDefinition = {
    id: IntegrationProvider.github,
    displayName: 'GitHub',
    description: 'Repositories, pull requests, and issues',
    capabilities: ['github'],
    scopes: SCOPES,
    supportsRefresh: false,
    supportsRevoke: true,
  };

  constructor(private readonly config: AppConfigService) {
    super();
  }

  isConfigured(): boolean {
    const { clientId, clientSecret } = this.config.oauth.github;
    return Boolean(clientId && clientSecret);
  }

  getAuthorizationUrl(params: AuthorizationParams): string {
    const { clientId } = this.requireCredentials();
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('scope', SCOPES.join(' '));
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async exchangeCode(params: ExchangeCodeParams): Promise<OAuthTokenSet> {
    const { clientId, clientSecret } = this.requireCredentials();
    const token = await fetchJson<{
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    }>('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: params.code,
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier,
      }),
    });

    if (!token.access_token) {
      throw new Error(
        token.error_description ?? token.error ?? 'GitHub OAuth failed',
      );
    }

    return {
      accessToken: token.access_token,
      tokenType: token.token_type,
      scope: splitScopes(token.scope),
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenSet> {
    throw new Error('GitHub classic OAuth apps do not issue refresh tokens');
  }

  async fetchAccountProfile(
    accessToken: string,
  ): Promise<ProviderAccountProfile> {
    const user = await fetchJson<{
      id: number;
      login: string;
      name?: string | null;
      email?: string | null;
    }>('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'chief-api',
      },
    });

    return {
      providerAccountId: String(user.id),
      email: user.email ?? undefined,
      displayName: user.name ?? user.login,
      metadata: { login: user.login },
    };
  }

  async checkHealth(accessToken: string): Promise<ProviderHealthResult> {
    try {
      await this.fetchAccountProfile(accessToken);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'GitHub health failed',
      };
    }
  }

  async revoke(accessToken: string): Promise<void> {
    const { clientId, clientSecret } = this.requireCredentials();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    await fetch(
      `https://api.github.com/applications/${clientId}/token`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${basic}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'chief-api',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      },
    );
  }

  private requireCredentials() {
    const creds = this.config.oauth.github;
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('GitHub OAuth is not configured');
    }
    return creds;
  }
}
