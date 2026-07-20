import { createDurableKv } from '@/services/durableKv';

/**
 * Better Auth / app secret storage.
 * Web: durable via localStorage (survives Vercel refresh).
 * Native Expo Go: in-memory (native SecureStore host is unreliable).
 *
 * Implements sync + async APIs used by @better-auth/expo.
 */
const kv = createDurableKv();

export const memorySecureStore = {
  getItem(key: string): string | null {
    return kv.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    kv.setItem(key, String(value));
  },

  async getItemAsync(key: string): Promise<string | null> {
    return memorySecureStore.getItem(key);
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    await memorySecureStore.setItem(key, value);
  },

  async deleteItemAsync(key: string): Promise<void> {
    kv.removeItem(key);
  },

  deleteItem(key: string): void {
    kv.removeItem(key);
  },
};
