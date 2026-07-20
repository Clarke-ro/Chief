/**
 * Linking-based ExpoWebBrowser when the native module is missing.
 * Opens the system browser and resolves when a matching redirect deep link arrives,
 * or when the app returns to the foreground (user switched back manually).
 */
import { AppState, Linking } from 'react-native';

function openAuthSessionAsync(url, redirectUrl) {
  return new Promise(async (resolve) => {
    let settled = false;
    const redirectBase = typeof redirectUrl === 'string' ? redirectUrl.split('?')[0] : '';
    let sawBackground = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
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

    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        finish({ type: 'cancel' });
        return;
      }
      await Linking.openURL(url);
    } catch {
      finish({ type: 'cancel' });
    }
  });
}

const ExpoWebBrowser = {
  openBrowserAsync: async (url) => {
    await Linking.openURL(url);
    return { type: 'opened' };
  },
  dismissBrowser: async () => {},
  openAuthSessionAsync,
  dismissAuthSession: async () => {},
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

export default ExpoWebBrowser;
