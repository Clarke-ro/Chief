import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing, typography } from '@/theme';

type AppChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

type AppChipProps = {
  label: string;
  tone?: AppChipTone;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** Allow long labels to wrap inside the chip (chat / flexible rows). */
  wrap?: boolean;
};

/** Compact pill label; pressable when `onPress` is provided. */
export function AppChip({
  label,
  tone = 'neutral',
  selected = false,
  onPress,
  disabled = false,
  size = 'md',
  wrap = false,
}: AppChipProps) {
  const colors = useThemeColors();
  const compact = size === 'sm';

  const tones: Record<AppChipTone, { bg: string; fg: string; border: string }> = {
    neutral: {
      bg: colors.bgSubtle,
      fg: colors.textSecondary,
      border: colors.borderSubtle,
    },
    accent: {
      bg: colors.accentMuted,
      fg: colors.accent,
      border: colors.accentMuted,
    },
    success: {
      bg: `${colors.success}18`,
      fg: colors.success,
      border: `${colors.success}28`,
    },
    warning: {
      bg: `${colors.warning}18`,
      fg: colors.warning,
      border: `${colors.warning}28`,
    },
    danger: {
      bg: `${colors.danger}18`,
      fg: colors.danger,
      border: `${colors.danger}28`,
    },
  };

  const t = tones[tone];
  const bg = selected ? colors.accent : t.bg;
  const fg = selected ? colors.bgElevated : t.fg;
  const border = selected ? colors.accent : t.border;

  const content = (
    <View
      style={[
        styles.chip,
        compact && styles.chipSm,
        wrap && styles.chipWrap,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          compact && styles.labelSm,
          wrap && styles.labelWrap,
          { color: fg },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityRole="text" accessibilityLabel={label}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        wrap && styles.pressWrap,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipSm: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  chipWrap: {
    maxWidth: '100%',
    flexShrink: 1,
    minWidth: 0,
  },
  pressWrap: {
    maxWidth: '100%',
    flexShrink: 1,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  labelWrap: {
    flexShrink: 1,
    lineHeight: 18,
  },
  pressed: { opacity: 0.8 },
});
