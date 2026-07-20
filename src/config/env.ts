/**
 * Public runtime config (Expo `EXPO_PUBLIC_*` only).
 * Never put API secrets, private keys, or client secrets here — those stay on the backend.
 *
 * Metro only inlines *static* `process.env.EXPO_PUBLIC_*` references.
 * Dynamic `process.env[name]` stays undefined in production web bundles.
 */

function trimPublic(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

const apiBaseUrlRaw = trimPublic(process.env.EXPO_PUBLIC_API_BASE_URL);
const supabaseUrlRaw = trimPublic(process.env.EXPO_PUBLIC_SUPABASE_URL);

export const env = {
  /** Backend origin for authenticated API calls. Empty until configured. */
  apiBaseUrl: apiBaseUrlRaw ? stripTrailingSlash(apiBaseUrlRaw) : undefined,

  /** Optional app environment label (development | preview | production). */
  appEnv:
    trimPublic(process.env.EXPO_PUBLIC_APP_ENV) ?? (__DEV__ ? 'development' : 'production'),

  /**
   * AI provider hint for the client (`mock` | `openai` | `anthropic` | `custom`).
   * Model keys never live in the app — only the gateway URL / provider id.
   */
  aiProvider: trimPublic(process.env.EXPO_PUBLIC_AI_PROVIDER),

  /** Supabase project URL (Project Settings → API). */
  supabaseUrl: supabaseUrlRaw ? stripTrailingSlash(supabaseUrlRaw) : undefined,

  /** Supabase anon / public key only — never the service_role key. */
  supabaseAnonKey: trimPublic(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),

  /**
   * When true (and API is configured), Home pulls `/v1/workspace/brief`.
   * Failures fall back to the mock seed brief.
   */
  liveHomeBriefFlag: trimPublic(process.env.EXPO_PUBLIC_LIVE_HOME_BRIEF) === 'true',

  get isApiConfigured(): boolean {
    return Boolean(this.apiBaseUrl);
  },

  get isSupabaseConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey);
  },

  get liveHomeBrief(): boolean {
    return this.liveHomeBriefFlag && this.isApiConfigured;
  },
} as const;
