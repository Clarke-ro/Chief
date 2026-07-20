import { createDurableKv } from '@/services/durableKv';

export type KeyValueStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
  clearAll: () => void;
};

const CHIEF_PREFIX = 'chief.';

/**
 * Non-secret app storage (theme, onboarding flag, workspace-scoped UI data).
 * Web: durable localStorage. Native Expo Go: in-memory until MMKV is safe.
 * Auth tokens stay in `secureStorage` / Better Auth store — never here.
 */
const kv = createDurableKv();

export const storage: KeyValueStorage = {
  getString: (key) => kv.getItem(key) ?? undefined,
  set: (key, value) => {
    kv.setItem(key, value);
  },
  remove: (key) => {
    kv.removeItem(key);
  },
  clearAll: () => {
    kv.clearPrefix(CHIEF_PREFIX);
  },
};
