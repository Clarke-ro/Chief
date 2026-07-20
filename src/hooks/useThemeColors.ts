import { darkColors, lightColors, type ThemeColors } from '@/theme/colors';
import { useThemeOverride } from '@/theme/ThemeOverride';

import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';

export function useThemeColors(): ThemeColors {
  const override = useThemeOverride();
  const scheme = useResolvedColorScheme();
  if (override) return override;
  return scheme === 'dark' ? darkColors : lightColors;
}
