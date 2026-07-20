import { createContext, ReactNode, useContext } from 'react';

import type { ThemeColors } from '@/theme/colors';

const ThemeOverrideContext = createContext<ThemeColors | null>(null);

/** Force a color palette for a subtree (e.g. always-dark onboarding). */
export function ThemeOverrideProvider({
  colors,
  children,
}: {
  colors: ThemeColors;
  children: ReactNode;
}) {
  return (
    <ThemeOverrideContext.Provider value={colors}>{children}</ThemeOverrideContext.Provider>
  );
}

export function useThemeOverride(): ThemeColors | null {
  return useContext(ThemeOverrideContext);
}
