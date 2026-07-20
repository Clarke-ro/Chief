import { StyleSheet, Text, View } from 'react-native';

import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import { AnimatedCounter } from '@/features/analytics/components/AnimatedCounter';
import type { AiImpactMetric } from '@/features/analytics/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing, typography } from '@/theme';

type AiImpactSectionProps = {
  metrics: AiImpactMetric[];
};

/** Section 2 — How much work has Chief saved me? (2-column metric grid) */
export function AiImpactSection({ metrics }: AiImpactSectionProps) {
  const colors = useThemeColors();

  return (
    <AnalyticsSection question="How much work has Chief saved me?" title="Time Saved">
      <View style={styles.grid}>
        {metrics.map((metric) => {
          const decimals = Number.isInteger(metric.value) ? 0 : 1;
          return (
            <View key={metric.id} style={[styles.cell, { borderBottomColor: colors.borderSubtle }]}>
              <AnimatedCounter value={metric.value} decimals={decimals} suffix={metric.suffix} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>{metric.label}</Text>
            </View>
          );
        })}
      </View>
    </AnalyticsSection>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[8],
  },
  cell: {
    width: '50%',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[4],
  },
  label: {
    ...typography.footnote,
  },
});
