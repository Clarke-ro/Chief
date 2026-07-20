import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing, typography } from '@/theme';

type ConfidenceIndicatorProps = {
  /** Value from 0 to 1 */
  value: number;
  /** Hide the percent label */
  showLabel?: boolean;
};

function toneFor(value: number): 'high' | 'medium' | 'low' {
  if (value >= 0.8) return 'high';
  if (value >= 0.55) return 'medium';
  return 'low';
}

export function ConfidenceIndicator({ value, showLabel = true }: ConfidenceIndicatorProps) {
  const colors = useThemeColors();
  const clamped = Math.max(0, Math.min(1, value));
  const tone = toneFor(clamped);
  const color = colors.confidence[tone];
  const percent = Math.round(clamped * 100);

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessibilityLabel={`Confidence ${percent} percent`}
    >
      <View style={[styles.track, { backgroundColor: colors.bgSubtle }]}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      {showLabel ? <Text style={[styles.label, { color }]}>{percent}%</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    minWidth: 72,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
    minWidth: 36,
    maxWidth: 48,
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
