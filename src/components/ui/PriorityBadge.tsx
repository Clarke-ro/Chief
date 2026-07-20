import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing, typography } from '@/theme';

export type PriorityLevel = 'high' | 'medium' | 'low';

type PriorityBadgeProps = {
  priority: PriorityLevel;
  /** Compact badge aligned with caption-sized meta text */
  size?: 'sm' | 'md';
};

const LABELS: Record<PriorityLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const colors = useThemeColors();
  const color = colors.priority[priority];
  const compact = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeSm,
        { backgroundColor: `${color}18` },
      ]}
    >
      <View style={[styles.dot, compact && styles.dotSm, { backgroundColor: color }]} />
      <Text style={[styles.label, compact && styles.labelSm, { color }]}>{LABELS[priority]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    flexShrink: 0,
  },
  badgeSm: {
    gap: 3,
    paddingHorizontal: spacing[4],
    paddingVertical: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
  },
  dotSm: {
    width: 4,
    height: 4,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 14,
  },
});
