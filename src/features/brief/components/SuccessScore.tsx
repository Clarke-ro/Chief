import { StyleSheet, Text, View } from 'react-native';

import { ProgressRing } from '@/components/ui';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type SuccessScoreProps = {
  score: number;
  /** Day-readiness level (e.g. Light day, On track, Heavy day). */
  label: string;
  insight: string;
  /** Fixed metric name shown under the ring — defaults to Focus Score. */
  metricName?: string;
  /** When false, hide the insight line under the ring (default true) */
  showInsight?: boolean;
};

/** Compact Focus Score ring for the Home header — metric name is always visible. */
export function SuccessScore({
  score,
  label,
  insight,
  metricName = 'Focus Score',
  showInsight = false,
}: SuccessScoreProps) {
  const colors = useThemeColors();
  const percent = Math.round(score * 100);

  return (
    <View
      accessible
      accessibilityLabel={`${metricName} ${percent} percent. ${label}. ${insight}`}
      style={styles.wrap}
    >
      <ProgressRing progress={score} size={72} strokeWidth={6} color={colors.success}>
        <Text style={[styles.score, { color: colors.text }]}>{percent}</Text>
      </ProgressRing>
      <Text style={[styles.metricName, { color: colors.textSecondary }]}>{metricName}</Text>
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
    gap: spacing[4],
    flexShrink: 0,
    maxWidth: 120,
  },
  score: {
    ...typography.title3,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricName: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    textAlign: 'center',
  },
  label: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    textAlign: 'center',
  },
  insight: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 14,
  },
});
