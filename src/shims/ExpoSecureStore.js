/**
 * In-memory SecureStore native module shim for when ExpoSecureStore is missing
 * (broken Expo Go host). Better Auth needs working getItem/setItem or sessions
 * never persist and sign-in appears to succeed then immediately fail.
 */
const store = new Map();

function getValueWithKeySync(key) {
  return store.has(key) ? store.get(key) : null;
}

function setValueWithKeySync(value, key) {
  store.set(key, value);
}

async function getValueWithKeyAsync(key) {
  return getValueWithKeySync(key);
}

async function setValueWithKeyAsync(value, key) {
  setValueWithKeySync(value, key);
}

async function deleteValueWithKeyAsync(key) {
  store.delete(key);
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
