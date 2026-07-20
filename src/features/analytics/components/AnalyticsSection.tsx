import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GroupedCard } from '@/components/ui';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type AnalyticsSectionProps = {
  question: string;
  title: string;
  children: ReactNode;
  /**
   * `card` — children in one grouped card (default).
   * `stack` — header only; children supply their own spaced cards.
   * `flush` — one card, edge-to-edge rows (no inner padding).
   */
  layout?: 'card' | 'stack' | 'flush';
};

/** Analytics block — section labels above grouped card content. */
export function AnalyticsSection({
  question,
  title,
  children,
  layout = 'card',
}: AnalyticsSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.question, { color: colors.textTertiary }]}>{question}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {layout === 'stack' ? (
        <View style={styles.stack}>{children}</View>
      ) : (
        <GroupedCard contentStyle={layout === 'flush' ? undefined : styles.padded}>
          {children}
        </GroupedCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[16],
    gap: spacing[8],
  },
  question: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
  },
  title: {
    ...typography.title2,
    letterSpacing: -0.4,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  padded: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
  },
  stack: {
    gap: spacing[12],
  },
});
