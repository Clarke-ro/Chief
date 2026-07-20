import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper around Expo SecureStore for secrets (tokens, credentials).
 * Prefer `storage` (MMKV/memory) for non-sensitive preferences.
 * Soft-fails on platform/storage errors so logout and boot stay resilient.
 *
 * @see https://docs.expo.dev/versions/v57.0.0/sdk/securestore/
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      if (__DEV__) {
        console.warn('[secureStorage] getItem failed', key, error);
      }
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      if (__DEV__) {
        console.warn('[secureStorage] setItem failed', key, error);
      }
      throw error instanceof Error ? error : new Error('SecureStore setItem failed.');
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      if (__DEV__) {
        console.warn('[secureStorage] deleteItem failed', key, error);
      }
      throw error instanceof Error ? error : new Error('SecureStore deleteItem failed.');
    }
  },
};
