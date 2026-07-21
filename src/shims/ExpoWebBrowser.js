/**
 * ExpoWebBrowser: prefer the native module when Expo Go/dev client provides it.
 * Fall back to Linking when the native module is missing (common Expo Go flake).
 *
 * The Linking fallback must never hang: skip unreliable canOpenURL waits, open
 * immediately, and time out if neither a deep link nor AppState return arrives.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';
import { AppState, Linking, Platform } from 'react-native';

const native = requireOptionalNativeModule('ExpoWebBrowser');

const AUTH_SESSION_TIMEOUT_MS = 5 * 60 * 1000;

function openAuthSessionViaLinking(url, redirectUrl) {
  return new Promise((resolve) => {
    let settled = false;
    const redirectBase = typeof redirectUrl === 'string' ? redirectUrl.split('?')[0] : '';
    let sawBackground = false;
    let timeoutId;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.remove();
      appSub?.remove();
      resolve(result);
    };

    const subscription = Linking.addEventListener('url', ({ url: incoming }) => {
      if (
        !redirectBase ||
        incoming.startsWith(redirectBase) ||
        incoming.includes('integrations/callback')
      ) {
        finish({ type: 'success', url: incoming });
      }
    });

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        sawBackground = true;
        return;
      }
      if (next === 'active' && sawBackground && !settled) {
        finish({ type: 'dismiss' });
      }
    });

    timeoutId = setTimeout(() => {
      finish({ type: 'cancel' });
    }, AUTH_SESSION_TIMEOUT_MS);

    // Do not await canOpenURL — it can hang indefinitely on some Android/iOS setups.
    void Linking.openURL(url).catch(() => {
      finish({ type: 'cancel' });
    });
  });
}

function openAuthSessionAsync(url, redirectUrl) {
  // Web: full-page navigate to the provider. Backend redirects back to
  // /integrations/callback on this origin — waiting on AppState/Linking hangs forever.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return new Promise(() => {});
  }

  if (native?.openAuthSessionAsync) {
    return native.openAuthSessionAsync(url, redirectUrl);
  }

  return openAuthSessionViaLinking(url, redirectUrl);
}

const linkingFallback = {
  openBrowserAsync: async (url) => {
    await Linking.openURL(url);
    return { type: 'opened' };
  },
  dismissBrowser: async () => {},
  openAuthSessionAsync,
  dismissAuthSession: async () => {
    if (typeof native?.dismissAuthSession === 'function') {
      await native.dismissAuthSession();
    }
  },
  warmUpAsync: async () => ({}),
  coolDownAsync: async () => ({}),
  mayInitWithUrlAsync: async () => ({}),
  getCustomTabsSupportingBrowsersAsync: async () => ({
    defaultBrowserPackage: undefined,
    preferredBrowserPackage: undefined,
    browserPackages: [],
    servicePackages: [],
  }),
};

// Prefer native methods when present; always use our openAuthSessionAsync so web
// and Linking fallback behavior stay consistent.
const ExpoWebBrowser = native
  ? {
      ...native,
      openAuthSessionAsync,
      openBrowserAsync:
        typeof native.openBrowserAsync === 'function'
          ? native.openBrowserAsync.bind(native)
          : linkingFallback.openBrowserAsync,
      dismissBrowser:
        typeof native.dismissBrowser === 'function'
          ? native.dismissBrowser.bind(native)
          : linkingFallback.dismissBrowser,
      dismissAuthSession:
        typeof native.dismissAuthSession === 'function'
          ? native.dismissAuthSession.bind(native)
          : linkingFallback.dismissAuthSession,
    }
  : linkingFallback;

export default ExpoWebBrowser;
