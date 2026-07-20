/**
 * SecureStore native module shim.
 * Web: durable localStorage. Native Expo Go: in-memory (host module missing/broken).
 */
const memory = new Map();

function canUseLocalStorage() {
  try {
    return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function storageKey(key) {
  return `chief.secure.${key}`;
}

function getValueWithKeySync(key) {
  const k = storageKey(key);
  if (memory.has(k)) return memory.get(k);
  if (!canUseLocalStorage()) return null;
  try {
    const value = globalThis.localStorage.getItem(k);
    if (value != null) memory.set(k, value);
    return value;
  } catch {
    return null;
  }
}

function setValueWithKeySync(value, key) {
  const k = storageKey(key);
  memory.set(k, value);
  if (!canUseLocalStorage()) return;
  try {
    globalThis.localStorage.setItem(k, value);
  } catch {
    // ignore
  }
}

async function getValueWithKeyAsync(key) {
  return getValueWithKeySync(key);
}

async function setValueWithKeyAsync(value, key) {
  setValueWithKeySync(value, key);
}

async function deleteValueWithKeyAsync(key) {
  const k = storageKey(key);
  memory.delete(k);
  if (!canUseLocalStorage()) return;
  try {
    globalThis.localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

const ExpoSecureStore = {
  AFTER_FIRST_UNLOCK: 0,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  ALWAYS: 2,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 3,
  ALWAYS_THIS_DEVICE_ONLY: 4,
  WHEN_UNLOCKED: 5,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
  getValueWithKeySync,
  setValueWithKeySync,
  getValueWithKeyAsync,
  setValueWithKeyAsync,
  deleteValueWithKeyAsync,
  canUseBiometricAuthentication: () => false,
};

export default ExpoSecureStore;
