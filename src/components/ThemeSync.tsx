import { useEffect } from 'react';

import { applyThemePreference, usePreferencesStore } from '@/stores';

/**
 * Keeps React Native Appearance in sync with the persisted theme preference.
 * Mount once near the app root.
 */
export function ThemeSync() {
  const theme = usePreferencesStore((s) => s.theme);

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  return null;
}
