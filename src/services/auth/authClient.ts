import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { env } from '@/config/env';

function createClient() {
  if (!env.apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required for auth.');
  }

  return createAuthClient({
    baseURL: env.apiBaseUrl,
    plugins: [
      expoClient({
        scheme: 'chief',
        storagePrefix: 'chief',
        storage: SecureStore,
      }),
    ],
  });
}

type AuthClient = ReturnType<typeof createClient>;

let cached: AuthClient | null = null;

export function getAuthClient(): AuthClient {
  if (!cached) {
    cached = createClient();
  }
  return cached;
}

/** Better Auth client — lazily initialized once API base URL is available. */
export const authClient = new Proxy({} as AuthClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuthClient(), prop, receiver);
  },
});
