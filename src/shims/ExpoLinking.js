/**
 * Soft ExpoLinking fallback using React Native Linking when the native
 * ExpoLinking module is missing from Expo Go.
 *
 * Return a clean app-scheme root URL — never a hostUri path like
 * `127.0.0.1:8081/`, which expo-router shows as Unmatched Route.
 */
import { Linking } from 'react-native';

const ROOT_URL = 'chief://';

const listeners = new Set();
let rnSubscription = null;

function ensureRnSubscription() {
  if (rnSubscription) return;
  rnSubscription = Linking.addEventListener('url', ({ url }) => {
    for (const listener of listeners) {
      listener({ url });
    }
  });
}

export default {
  getLinkingURL() {
    return ROOT_URL;
  },
  clearInitialURL() {},
  addListener(eventName, listener) {
    if (eventName !== 'onURLReceived') {
      return { remove() {} };
    }
    ensureRnSubscription();
    listeners.add(listener);
    return {
      remove() {
        listeners.delete(listener);
      },
    };
  },
};
