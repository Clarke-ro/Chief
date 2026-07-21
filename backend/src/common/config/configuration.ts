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
    apiKey?: string;
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
  ai: {
    /** Primary preference when OpenAI is available; mock only if no keys at all. */
    provider: 'openai' | 'gemini' | 'mock';
    apiKey: string;
    model: string;
    geminiApiKey: string;
    geminiModel: string;
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
      apiKey: env.BETTER_AUTH_API_KEY || undefined,
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
    ai: {
      provider: env.OPENAI_API_KEY
        ? env.AI_PROVIDER === 'mock'
          ? 'mock'
          : 'openai'
        : env.GEMINI_API_KEY
          ? 'gemini'
          : 'mock',
      apiKey: env.OPENAI_API_KEY,
      model: env.AI_MODEL || 'gpt-5.6',
      geminiApiKey: env.GEMINI_API_KEY,
      geminiModel: env.GEMINI_MODEL || 'gemini-3.6-flash',
    },
    logLevel: env.LOG_LEVEL,
    swaggerEnabled:
      env.SWAGGER_ENABLED === 'true'
        ? true
        : env.SWAGGER_ENABLED === 'false'
          ? false
          : env.NODE_ENV !== 'production',
  };
}
