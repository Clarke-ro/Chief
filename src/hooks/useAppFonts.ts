/**
 * Fonts are optional for Expo Go boot.
 * Loading @expo-google-fonts/inter → expo-font → expo-asset can crash when
 * native Expo modules are not registered yet. Use system fonts instead.
 */
export function useAppFonts(): boolean {
  return true;
}
