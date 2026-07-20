/**
 * Sync key/value with an in-memory cache.
 * On web, mirrors to localStorage so prefs/auth survive refresh (Vercel).
 * Native Expo Go keeps memory-only (SecureStore/MMKV hosts are unreliable there).
 */

function canUseLocalStorage(): boolean {
  try {
    return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export type DurableKv = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clearPrefix: (prefix: string) => void;
};

export function createDurableKv(options?: { persist?: boolean }): DurableKv {
  const memory = new Map<string, string>();
  const persist = options?.persist ?? canUseLocalStorage();

  return {
    getItem(key) {
      if (memory.has(key)) return memory.get(key) ?? null;
      if (!persist || !canUseLocalStorage()) return null;
      try {
        const value = globalThis.localStorage.getItem(key);
        if (value != null) memory.set(key, value);
        return value;
      } catch {
        return null;
      }
    },

    setItem(key, value) {
      const next = String(value);
      memory.set(key, next);
      if (!persist || !canUseLocalStorage()) return;
      try {
        globalThis.localStorage.setItem(key, next);
      } catch {
        // Quota / private mode — keep memory write.
      }
    },

    removeItem(key) {
      memory.delete(key);
      if (!persist || !canUseLocalStorage()) return;
      try {
        globalThis.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },

    clearPrefix(prefix) {
      for (const key of [...memory.keys()]) {
        if (key.startsWith(prefix)) memory.delete(key);
      }
      if (!persist || !canUseLocalStorage()) return;
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < globalThis.localStorage.length; i += 1) {
          const key = globalThis.localStorage.key(i);
          if (key?.startsWith(prefix)) toRemove.push(key);
        }
        for (const key of toRemove) globalThis.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}
