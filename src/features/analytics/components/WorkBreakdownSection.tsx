import { StyleSheet, Text, View } from 'react-native';

import { GroupedCard, ProgressBar } from '@/components/ui';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import type { WorkCategory } from '@/features/analytics/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing, typography } from '@/theme';

type WorkBreakdownSectionProps = {
  categories: WorkCategory[];
};

/** Section 3 — Where is my time going? One card per category. */
export function WorkBreakdownSection({ categories }: WorkBreakdownSectionProps) {
  const colors = useThemeColors();

  return (
    <AnalyticsSection question="Where is my time going?" title="Work Breakdown" layout="stack">
      {categories.map((category) => (
        <GroupedCard key={category.id} contentStyle={styles.card}>
          <View style={styles.header}>
            <Text style={[styles.label, { color: colors.text }]}>{category.label}</Text>
            <Text style={[styles.meta, { color: colors.textTertiary }]}>
              {Math.round(category.share * 100)}% · {category.hours}h
            </Text>
          </View>
          <ProgressBar
            progress={category.share}
            height={6}
            accessibilityLabel={`${category.label} ${Math.round(category.share * 100)} percent`}
          />
        </GroupedCard>
      ))}
    </AnalyticsSection>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    gap: spacing[12],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  label: {
    ...typography.callout,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
    flexShrink: 1,
  },
  meta: {
    ...typography.footnote,
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
    flexShrink: 0,
  },
});
