import { Fragment } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { InsetSeparator } from '@/components/ui';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import { SparkLine } from '@/features/analytics/components/SparkLine';
import type { TrendSeries } from '@/features/analytics/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing, typography } from '@/theme';

type WeeklyTrendsSectionProps = {
  series: TrendSeries[];
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Section 5 — Am I improving? */
export function WeeklyTrendsSection({ series }: WeeklyTrendsSectionProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - spacing[16] * 2 - spacing[16] * 2, 680);

  return (
    <AnalyticsSection question="Am I improving?" title="Weekly Trends" layout="flush">
      {series.map((item, index) => {
        const latest = item.points[item.points.length - 1] ?? 0;
        const first = item.points[0] ?? 0;
        const delta = Math.round((latest - first) * 100);
        return (
          <Fragment key={item.id}>
            <View style={styles.block}>
              <View style={styles.header}>
                <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
                <Text
                  style={[styles.delta, { color: delta >= 0 ? colors.success : colors.danger }]}
                >
                  {delta >= 0 ? '+' : ''}
                  {delta}%
                </Text>
              </View>
              <SparkLine points={item.points} width={chartWidth} height={56} showEndDot />
              <View style={[styles.days, { width: chartWidth }]}>
                {DAY_LABELS.map((day, i) => (
                  <Text
                    key={`${item.id}-${i}`}
                    style={[styles.day, { color: colors.textTertiary }]}
                  >
                    {day}
                  </Text>
                ))}
              </View>
            </View>
            {index < series.length - 1 ? <InsetSeparator inset={spacing[16]} /> : null}
          </Fragment>
        );
      })}
    </AnalyticsSection>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.callout,
    fontWeight: '600',
  },
  delta: {
    ...typography.subhead,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    ...typography.caption,
    width: 16,
    textAlign: 'center',
  },
});
