import { Platform } from 'react-native';

const APP_SCHEME = 'chief';

/**
 * Origin Better Auth expects for native requests.
 * Avoid Linking.createURL / Constants when Expo Go's native host is broken —
 * those can produce unmatched routes like `exp://127.0.0.1:8081/127.0.0.1:8081/`.
 */
export function getMobileAuthOrigin(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
  }

  // Expo Go deep links use exp://; custom builds use chief://.
  // Prefer chief:// for auth origin stability when Constants.appOwnership is unavailable.
  return `${APP_SCHEME}://`;
}
