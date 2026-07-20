import { ReactNode } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { typography, type TypographyVariant } from '@/theme';

type TextColor = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'warning' | 'danger';

type TypographyProps = TextProps & {
  variant?: TypographyVariant;
  color?: TextColor;
  children: ReactNode;
  align?: TextStyle['textAlign'];
};

export function Typography({
  variant = 'body',
  color = 'primary',
  children,
  align,
  style,
  ...rest
}: TypographyProps) {
  const colors = useThemeColors();

  const colorMap: Record<TextColor, string> = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };

  return (
    <Text
      style={[typography[variant], { color: colorMap[color], textAlign: align }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
