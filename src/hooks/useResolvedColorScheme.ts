import { useColorScheme } from 'react-native';

import { usePreferencesStore, type ThemePreference } from '@/stores';

export type ResolvedColorScheme = 'light' | 'dark';

/** Resolve stored preference against the OS scheme. */
export function resolveColorScheme(
  preference: ThemePreference,
  system: ReturnType<typeof useColorScheme>,
): ResolvedColorScheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

/** App-wide color scheme after applying System / Light / Dark preference. */
export function useResolvedColorScheme(): ResolvedColorScheme {
  const preference = usePreferencesStore((s) => s.theme);
  const system = useColorScheme();
  return resolveColorScheme(preference, system);
}
