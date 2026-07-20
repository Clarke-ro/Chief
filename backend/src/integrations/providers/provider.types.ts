import type { IntegrationProvider } from '@prisma/client';

export type ProviderCapability =
  | 'gmail'
  | 'calendar'
  | 'drive'
  | 'outlook'
  | 'onedrive'
  | 'slack'
  | 'github'
  | 'notion';

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: Date;
  scope?: string[];
  raw?: Record<string, unknown>;
};

export type ProviderAccountProfile = {
  providerAccountId: string;
  email?: string;
  displayName?: string;
  metadata?: Record<string, unknown>;
};

export type ProviderHealthResult = {
  ok: boolean;
  message?: string;
};

export type ProviderDefinition = {
  id: IntegrationProvider;
  displayName: string;
  description: string;
  capabilities: ProviderCapability[];
  scopes: string[];
  supportsRefresh: boolean;
  supportsRevoke: boolean;
};

export type AuthorizationParams = {
  state: string;
  codeChallenge: string;
  redirectUri: string;
};

export type ExchangeCodeParams = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};
