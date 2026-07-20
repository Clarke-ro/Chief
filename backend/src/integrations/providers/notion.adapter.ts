import { Injectable } from '@nestjs/common';
import { IntegrationProvider } from '@prisma/client';
import { AppConfigService } from '../../common/config/app-config.service';
import { ProviderAdapter } from './provider.adapter';
import { fetchJson } from './oauth-http';
import type {
  AuthorizationParams,
  ExchangeCodeParams,
  OAuthTokenSet,
  ProviderAccountProfile,
  ProviderDefinition,
  ProviderHealthResult,
} from './provider.types';

@Injectable()
export class NotionAdapter extends ProviderAdapter {
  readonly definition: ProviderDefinition = {
    id: IntegrationProvider.notion,
    displayName: 'Notion',
    description: 'Notion pages and databases',
    capabilities: ['notion'],
    scopes: [],
    supportsRefresh: false,
    supportsRevoke: false,
  };

  constructor(private readonly config: AppConfigService) {
    super();
  }

  isConfigured(): boolean {
    const { clientId, clientSecret } = this.config.oauth.notion;
    return Boolean(clientId && clientSecret);
  }

  getAuthorizationUrl(params: AuthorizationParams): string {
    const { clientId } = this.requireCredentials();
    const url = new URL('https://api.notion.com/v1/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('owner', 'user');
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('state', params.state);
    return url.toString();
  }

  async exchangeCode(params: ExchangeCodeParams): Promise<OAuthTokenSet> {
    const { clientId, clientSecret } = this.requireCredentials();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const token = await fetchJson<{
      access_token: string;
      token_type?: string;
      workspace_id?: string;
      workspace_name?: string;
      bot_id?: string;
      owner?: {
        user?: { id?: string; name?: string; person?: { email?: string } };
      };
    }>('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: params.redirectUri,
      }),
    });

    return {
      accessToken: token.access_token,
      tokenType: token.token_type,
      raw: token as unknown as Record<string, unknown>,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenSet> {
    throw new Error('Notion OAuth tokens do not support refresh');
  }

  async fetchAccountProfile(
    accessToken: string,
  ): Promise<ProviderAccountProfile> {
    const me = await fetchJson<{
      bot?: { owner?: { user?: { id?: string; name?: string } } };
      id?: string;
      name?: string;
      person?: { email?: string };
      type?: string;
    }>('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const user = me.bot?.owner?.user;
    const providerAccountId = user?.id ?? me.id;
    if (!providerAccountId) {
      throw new Error('Notion profile missing account id');
    }

    return {
      providerAccountId,
      displayName: user?.name ?? me.name,
      email: me.person?.email,
    };
  }

  async checkHealth(accessToken: string): Promise<ProviderHealthResult> {
    try {
      await this.fetchAccountProfile(accessToken);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Notion health failed',
      };
    }
  }

  private requireCredentials() {
    const creds = this.config.oauth.notion;
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('Notion OAuth is not configured');
    }
    return creds;
  }
}
