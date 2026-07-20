import { StyleSheet, Text, View } from 'react-native';

import type { PriorityLevel } from '@/components/ui/PriorityBadge';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing, typography } from '@/theme';

type PriorityIndicatorProps = {
  priority: PriorityLevel;
  /** Show the text label beside the urgency dot */
  showLabel?: boolean;
  size?: 'sm' | 'md';
};

const LABELS: Record<PriorityLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Urgency indicator using theme priority tokens. */
export function PriorityIndicator({
  priority,
  showLabel = true,
  size = 'md',
}: PriorityIndicatorProps) {
  const colors = useThemeColors();
  const color = colors.priority[priority];
  const dot = size === 'sm' ? 5 : 6;

  return (
    <View
      style={[styles.wrap, { backgroundColor: `${color}18` }]}
      accessibilityRole="text"
      accessibilityLabel={`${LABELS[priority]} priority`}
    >
      <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }]} />
      {showLabel ? <Text style={[styles.label, { color }]}>{LABELS[priority]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  dot: {},
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
