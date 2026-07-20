/**
 * Public runtime config (Expo `EXPO_PUBLIC_*` only).
 * Never put API secrets, private keys, or client secrets here — those stay on the backend.
 */

function readPublic(name: string): string | undefined {
  // Metro inlines EXPO_PUBLIC_* at bundle time
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const env = {
  /** Backend origin for authenticated API calls. Empty until configured. */
  apiBaseUrl: (() => {
    const raw = readPublic('EXPO_PUBLIC_API_BASE_URL');
    return raw ? stripTrailingSlash(raw) : undefined;
  })(),

  /** Optional app environment label (development | preview | production). */
  appEnv: readPublic('EXPO_PUBLIC_APP_ENV') ?? (__DEV__ ? 'development' : 'production'),

  /**
   * AI provider hint for the client (`mock` | `openai` | `anthropic` | `custom`).
   * Model keys never live in the app — only the gateway URL / provider id.
   */
  aiProvider: readPublic('EXPO_PUBLIC_AI_PROVIDER'),

  /** Supabase project URL (Project Settings → API). */
  supabaseUrl: (() => {
    const raw = readPublic('EXPO_PUBLIC_SUPABASE_URL');
    return raw ? stripTrailingSlash(raw) : undefined;
  })(),

  /** Supabase anon / public key only — never the service_role key. */
  supabaseAnonKey: readPublic('EXPO_PUBLIC_SUPABASE_ANON_KEY'),

  get isApiConfigured(): boolean {
    return Boolean(this.apiBaseUrl);
  },

  get isSupabaseConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey);
  },
} as const;
