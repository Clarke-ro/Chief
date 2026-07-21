import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().default('chief-api'),
  API_PREFIX: z.string().default('v1'),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  /**
   * Better Auth Infrastructure dashboard key (`ba_...`).
   * Different from BETTER_AUTH_SECRET (cookie/session signing).
   */
  BETTER_AUTH_API_KEY: z.string().optional().default(''),
  /** Explicit public API URL. Optional on Railway if RAILWAY_PUBLIC_DOMAIN is set. */
  BETTER_AUTH_URL: z.string().url().optional(),
  /** Injected by Railway when a public domain is assigned. */
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),

  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters')
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') >= 32,
      'ENCRYPTION_KEY must be at least 32 UTF-8 bytes (prefer ASCII)',
    ),

  OAUTH_REDIRECT_BASE_URL: z.string().url().optional(),
  APP_OAUTH_SUCCESS_URL: z
    .string()
    .default('chief://integrations/callback?status=success'),
  APP_OAUTH_ERROR_URL: z
    .string()
    .default('chief://integrations/callback?status=error'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  MICROSOFT_CLIENT_ID: z.string().optional().default(''),
  MICROSOFT_CLIENT_SECRET: z.string().optional().default(''),
  MICROSOFT_TENANT_ID: z.string().optional().default('common'),
  SLACK_CLIENT_ID: z.string().optional().default(''),
  SLACK_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  NOTION_CLIENT_ID: z.string().optional().default(''),
  NOTION_CLIENT_SECRET: z.string().optional().default(''),

  /** OpenAI (or compatible) key — server-side only. Empty disables live Chief chat. */
  OPENAI_API_KEY: z.string().optional().default(''),
  /** Which model stack Chief uses: openai | mock */
  AI_PROVIDER: z.enum(['openai', 'mock']).optional().default('openai'),
  /** Responses API model id (e.g. gpt-5.6, gpt-4.1-mini). */
  AI_MODEL: z.string().optional().default('gpt-5.6'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  /** Omit in production to keep Swagger off; set explicitly to "true" to enable. */
  SWAGGER_ENABLED: z.enum(['true', 'false']).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const env = result.data;
  if (!env.BETTER_AUTH_URL && !env.RAILWAY_PUBLIC_DOMAIN) {
    throw new Error(
      'Invalid environment configuration: set BETTER_AUTH_URL or RAILWAY_PUBLIC_DOMAIN',
    );
  }

  const origins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.includes('*')) {
    throw new Error(
      'Invalid environment configuration: CORS_ORIGINS cannot include * while credentials are enabled',
    );
  }

  return env;
}

/** Stable public HTTPS origin for Better Auth + OAuth callbacks. */
export function resolvePublicBaseUrl(env: Env): string {
  if (env.BETTER_AUTH_URL) {
    return env.BETTER_AUTH_URL.replace(/\/$/, '');
  }
  return `https://${env.RAILWAY_PUBLIC_DOMAIN}`.replace(/\/$/, '');
}
