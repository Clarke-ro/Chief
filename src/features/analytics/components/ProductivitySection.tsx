import { StyleSheet, Text, View } from 'react-native';

import { ProgressRing } from '@/components/ui';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import { SparkLine } from '@/features/analytics/components/SparkLine';
import type { ProductivityScore } from '@/features/analytics/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing, typography } from '@/theme';

type ProductivitySectionProps = {
  data: ProductivityScore;
};

/** Section 1 — How productive have I been? */
export function ProductivitySection({ data }: ProductivitySectionProps) {
  const colors = useThemeColors();
  const percent = Math.round(data.score * 100);
  const changePct = Math.round(data.weeklyChange * 100);
  const up = changePct >= 0;

  return (
    <AnalyticsSection question="How productive have I been?" title="Productivity Score">
      <View style={styles.row}>
        <ProgressRing progress={data.score} size={96} strokeWidth={7} color={colors.accent}>
          <Text style={[styles.score, { color: colors.text }]}>{percent}</Text>
        </ProgressRing>

        <View style={styles.meta}>
          <Text style={[styles.changeLabel, { color: colors.textTertiary }]}>Weekly change</Text>
          <Text style={[styles.change, { color: up ? colors.success : colors.danger }]}>
            {up ? '+' : ''}
            {changePct}%
          </Text>
          <Text style={[styles.trendLabel, { color: colors.textTertiary }]}>Monthly trend</Text>
          <SparkLine points={data.monthlyTrend} width={140} height={36} />
        </View>
      </View>
      <Text style={[styles.insight, { color: colors.textSecondary }]}>{data.insight}</Text>
    </AnalyticsSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[32],
  },
  score: {
    ...typography.title2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  meta: {
    flex: 1,
    gap: spacing[4],
  },
  changeLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  change: {
    ...typography.title1,
    letterSpacing: -0.4,
    marginBottom: spacing[8],
  },
  trendLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: spacing[4],
  },
  insight: {
    ...typography.footnote,
    marginTop: spacing[20],
    lineHeight: 20,
  },
});
