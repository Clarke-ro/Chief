import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/theme';

type TagTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

type TagProps = {
  label: string;
  tone?: TagTone;
};

export function Tag({ label, tone = 'neutral' }: TagProps) {
  const colors = useThemeColors();

  const tones: Record<TagTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.bgSubtle, fg: colors.textSecondary },
    accent: { bg: colors.accentMuted, fg: colors.accent },
    success: { bg: `${colors.success}18`, fg: colors.success },
    warning: { bg: `${colors.warning}18`, fg: colors.warning },
    danger: { bg: `${colors.danger}18`, fg: colors.danger },
  };

  const t = tones[tone];

  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <Typography variant="caption" style={{ color: t.fg, fontWeight: '600' }}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
});
