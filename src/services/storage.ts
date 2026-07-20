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
 * Expo Go–safe storage.
 * react-native-mmkv v4 (Nitro) is not available in Expo Go and can disturb
 * native module startup if required too early — use in-memory for now.
 *
 * Non-secrets only (theme, day plan, chat seeds). Auth tokens → `secureStorage`.
 */
export const storage: KeyValueStorage = createMemoryStorage();
