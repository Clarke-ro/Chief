export type KeyValueStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
  clearAll: () => void;
};

function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();

  return {
    getString: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
    clearAll: () => {
      map.clear();
    },
  };
}

/**
 * Expo Go–safe storage: prefers MMKV, falls back to in-memory when native
 * modules are unavailable (Expo Go / environments without a custom native build).
 *
 * Non-secrets only (theme, day plan, chat seeds). Auth tokens → `secureStorage`.
 */
function createStorage(): KeyValueStorage {
  try {
    // Lazy require so Expo Go can fall back without a hard crash at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const mmkv = createMMKV({ id: 'chief.storage' });

    return {
      getString: (key) => mmkv.getString(key),
      set: (key, value) => {
        mmkv.set(key, value);
      },
      remove: (key) => {
        mmkv.remove(key);
      },
      clearAll: () => {
        mmkv.clearAll();
      },
    };
  } catch {
    return createMemoryStorage();
  }
}

export const storage = createStorage();
