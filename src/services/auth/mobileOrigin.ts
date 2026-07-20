import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const APP_SCHEME = 'chief';

/**
 * Origin Better Auth expects for native requests.
 * Expo Go uses exp:// — custom scheme builds use chief://.
 */
export function getMobileAuthOrigin(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
  }

  if (Constants.appOwnership === 'expo') {
    return Linking.createURL('');
  }

  return Linking.createURL('', { scheme: APP_SCHEME });
}
