import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/config/env';
import { secureStorage } from '@/services/secureStorage';

/**
 * Expo / React Native Supabase client.
 * Auth for the app stays on Better Auth + Nest — use this for Storage, Realtime,
 * or direct public table access when RLS allows the anon key.
 *
 * `@supabase/ssr` is installed for future web/SSR helpers; do not use cookie
 * adapters here (they assume a Next.js request/response).
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = env.supabaseUrl;
  const anonKey = env.supabaseAnonKey;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      storage: {
        getItem: (key) => secureStorage.getItem(key),
        setItem: (key, value) => secureStorage.setItem(key, value),
        removeItem: (key) => secureStorage.deleteItem(key),
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

export function tryGetSupabase(): SupabaseClient | null {
  if (!env.isSupabaseConfigured) return null;
  try {
    return getSupabase();
  } catch {
    return null;
  }
}
