import { StyleSheet, Text, View } from 'react-native';

import { ProgressRing } from '@/components/ui';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type SuccessScoreProps = {
  score: number;
  label: string;
  insight: string;
  /** When false, hide the insight line under the ring (default true) */
  showInsight?: boolean;
};

/** Compact day-success ring for the Home header. */
export function SuccessScore({ score, label, insight, showInsight = false }: SuccessScoreProps) {
  const colors = useThemeColors();
  const percent = Math.round(score * 100);

  return (
    <View
      accessible
      accessibilityLabel={`Success score ${percent} percent. ${label}. ${insight}`}
      style={styles.wrap}
    >
      <ProgressRing progress={score} size={72} strokeWidth={6} color={colors.success}>
        <Text style={[styles.score, { color: colors.text }]}>{percent}</Text>
      </ProgressRing>
      <Text style={[styles.label, { color: colors.success }]}>{label}</Text>
      {showInsight ? (
        <Text style={[styles.insight, { color: colors.textTertiary }]} numberOfLines={2}>
          {insight}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    flexShrink: 0,
    maxWidth: 108,
  },
  score: {
    ...typography.title3,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
  },
  insight: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 14,
  },
});
