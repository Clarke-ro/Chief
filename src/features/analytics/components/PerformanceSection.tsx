import { StyleSheet, Text, View } from 'react-native';

import { GroupedCard } from '@/components/ui';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import type { PerformanceMetric } from '@/features/analytics/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing, typography } from '@/theme';

type PerformanceSectionProps = {
  metrics: PerformanceMetric[];
};

/** Section 4 — How am I performing? One card per metric. */
export function PerformanceSection({ metrics }: PerformanceSectionProps) {
  const colors = useThemeColors();

  return (
    <AnalyticsSection question="How am I performing?" title="Performance" layout="stack">
      {metrics.map((metric) => (
        <GroupedCard key={metric.id} contentStyle={styles.card}>
          <View style={styles.copy}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{metric.label}</Text>
            {metric.detail ? (
              <Text style={[styles.detail, { color: colors.textTertiary }]}>{metric.detail}</Text>
            ) : null}
          </View>
          <Text style={[styles.value, { color: colors.text }]}>{metric.value}</Text>
        </GroupedCard>
      ))}
    </AnalyticsSection>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    gap: spacing[16],
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
    paddingTop: spacing[2],
  },
  label: {
    ...typography.callout,
    fontWeight: '500',
    lineHeight: 22,
  },
  detail: {
    ...typography.caption,
    lineHeight: 16,
  },
  value: {
    ...typography.title3,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    lineHeight: 28,
    flexShrink: 0,
    paddingTop: spacing[2],
  },
});
