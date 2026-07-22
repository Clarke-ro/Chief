import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Platform } from 'react-native';

/**
 * Loads Plus Jakarta Sans on native. Web uses the CSS family from `public/index.html`
 * so text paints immediately without blocking the first frame.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (Platform.OS === 'web') return true;
  return loaded;
}
