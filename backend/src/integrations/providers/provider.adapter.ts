import type {
  AuthorizationParams,
  ExchangeCodeParams,
  OAuthTokenSet,
  ProviderAccountProfile,
  ProviderDefinition,
  ProviderHealthResult,
} from './provider.types';

/**
 * Implement this interface to add a new official OAuth provider.
 * Register the adapter in ProviderRegistry — no other wiring required.
 */
export abstract class ProviderAdapter {
  abstract readonly definition: ProviderDefinition;

  abstract isConfigured(): boolean;

  abstract getAuthorizationUrl(params: AuthorizationParams): string;

  abstract exchangeCode(params: ExchangeCodeParams): Promise<OAuthTokenSet>;

  abstract refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet>;

  abstract fetchAccountProfile(
    accessToken: string,
  ): Promise<ProviderAccountProfile>;

  abstract checkHealth(accessToken: string): Promise<ProviderHealthResult>;

  async revoke(_accessToken: string): Promise<void> {
    // Optional — override when the provider supports revocation.
  }
}
