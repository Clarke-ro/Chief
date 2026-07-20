import { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const SIZE_PAD: Record<ButtonSize, { py: number; px: number; minH: number }> = {
  sm: { py: spacing[8], px: spacing[12], minH: 40 },
  md: { py: spacing[12], px: spacing[16], minH: 44 },
  lg: { py: spacing[16], px: spacing[20], minH: 52 },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const colors = useThemeColors();
  const pad = SIZE_PAD[size];

  const backgrounds: Record<ButtonVariant, string> = {
    primary: colors.text,
    secondary: colors.bgElevated,
    ghost: 'transparent',
    destructive: colors.danger,
    success: colors.success,
  };

  const labels: Record<ButtonVariant, string> = {
    primary: colors.bg,
    secondary: colors.text,
    ghost: colors.accent,
    destructive: '#FFFFFF',
    success: '#FFFFFF',
  };

  const backgroundColor = backgrounds[variant];
  const labelColor = labels[variant];
  const borderWidth = variant === 'secondary' ? StyleSheet.hairlineWidth : 0;
  const borderColor = variant === 'secondary' ? colors.border : 'transparent';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || loading}
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor,
          paddingVertical: pad.py,
          paddingHorizontal: pad.px,
          minHeight: pad.minH,
          borderWidth,
          borderColor,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text
          style={[
            typography.subhead,
            styles.label,
            { color: labelColor, fontFamily: fontFamily.medium },
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    alignSelf: 'stretch',
  },
  label: {
    textAlign: 'center',
  },
});
