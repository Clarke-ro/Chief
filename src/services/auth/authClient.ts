import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { env } from '@/config/env';
import { getMobileAuthOrigin } from '@/services/auth/mobileOrigin';

function createClient() {
  if (!env.apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required for auth.');
  }

  return createAuthClient({
    baseURL: env.apiBaseUrl,
    fetchOptions: {
      onRequest(context) {
        if (Platform.OS === 'web') return;
        const headers = new Headers(context.headers);
        headers.set('expo-origin', getMobileAuthOrigin());
        headers.set('x-skip-oauth-proxy', 'true');
        return { headers };
      },
    },
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
