import { memorySecureStore } from '@/services/auth/memorySecureStore';

/**
 * Secrets storage. Uses in-memory store while ExpoSecureStore native module
 * is unavailable (current TestFlight Expo Go host). Soft-fails on errors.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await memorySecureStore.getItemAsync(key);
    } catch (error) {
      if (__DEV__) {
        console.warn('[secureStorage] getItem failed', key, error);
      }
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await memorySecureStore.setItemAsync(key, value);
    } catch (error) {
      if (__DEV__) {
        console.warn('[secureStorage] setItem failed', key, error);
      }
      throw error instanceof Error ? error : new Error('SecureStore setItem failed.');
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      await memorySecureStore.deleteItemAsync(key);
    } catch (error) {
      if (__DEV__) {
        console.warn('[secureStorage] deleteItem failed', key, error);
      }
    }
  },
};
