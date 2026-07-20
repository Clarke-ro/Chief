import type { Env } from './env.schema';
import { resolvePublicBaseUrl } from './env.schema';

export type OAuthProviderCredentials = {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
};

export type AppConfig = {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  appName: string;
  apiPrefix: string;
  corsOrigins: string[];
  databaseUrl: string;
  redisUrl: string;
  betterAuth: {
    secret: string;
    url: string;
  };
  encryptionKey: string;
  oauth: {
    redirectBaseUrl: string;
    successUrl: string;
    errorUrl: string;
    google: OAuthProviderCredentials;
    microsoft: OAuthProviderCredentials & { tenantId: string };
    slack: OAuthProviderCredentials;
    github: OAuthProviderCredentials;
    notion: OAuthProviderCredentials;
  };
  logLevel: Env['LOG_LEVEL'];
  swaggerEnabled: boolean;
};

export function buildConfiguration(env: Env): AppConfig {
  const publicBaseUrl = resolvePublicBaseUrl(env);
  const redirectBaseUrl = (
    env.OAUTH_REDIRECT_BASE_URL ?? publicBaseUrl
  ).replace(/\/$/, '');

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    appName: env.APP_NAME,
    apiPrefix: env.API_PREFIX,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    betterAuth: {
      secret: env.BETTER_AUTH_SECRET,
      url: publicBaseUrl,
    },
    encryptionKey: env.ENCRYPTION_KEY,
    oauth: {
      redirectBaseUrl,
      successUrl: env.APP_OAUTH_SUCCESS_URL,
      errorUrl: env.APP_OAUTH_ERROR_URL,
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      microsoft: {
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
        tenantId: env.MICROSOFT_TENANT_ID || 'common',
      },
      slack: {
        clientId: env.SLACK_CLIENT_ID,
        clientSecret: env.SLACK_CLIENT_SECRET,
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
      notion: {
        clientId: env.NOTION_CLIENT_ID,
        clientSecret: env.NOTION_CLIENT_SECRET,
      },
    },
    logLevel: env.LOG_LEVEL,
    swaggerEnabled: env.SWAGGER_ENABLED,
  };
}
