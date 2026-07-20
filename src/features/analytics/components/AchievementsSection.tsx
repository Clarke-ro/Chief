import { Award } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { GroupedCard } from '@/components/ui';
import { AnalyticsSection } from '@/features/analytics/components/AnalyticsSection';
import type { Achievement } from '@/features/analytics/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing, typography } from '@/theme';

type AchievementsSectionProps = {
  achievements: Achievement[];
};

/** Section 6 — Celebrate meaningful milestones. One card per achievement. */
export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  const colors = useThemeColors();

  return (
    <AnalyticsSection question="What should I celebrate?" title="Achievements" layout="stack">
      {achievements.map((item) => (
        <GroupedCard key={item.id} contentStyle={styles.card}>
          <View
            style={[
              styles.icon,
              {
                backgroundColor: item.earned ? colors.accentMuted : colors.bgSubtle,
              },
            ]}
          >
            <Award
              size={18}
              color={item.earned ? colors.accent : colors.textTertiary}
              strokeWidth={2}
            />
          </View>
          <View style={styles.copy}>
            <Text
              style={[styles.title, { color: item.earned ? colors.text : colors.textSecondary }]}
            >
              {item.title}
            </Text>
            <Text style={[styles.detail, { color: colors.textTertiary }]}>{item.detail}</Text>
          </View>
          <Text
            style={[styles.badge, { color: item.earned ? colors.success : colors.textTertiary }]}
          >
            {item.earned ? 'Earned' : 'Locked'}
          </Text>
        </GroupedCard>
      ))}
    </AnalyticsSection>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: spacing[2],
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
  },
  title: {
    ...typography.callout,
    fontWeight: '600',
    lineHeight: 22,
  },
  detail: {
    ...typography.footnote,
    lineHeight: 18,
  },
  badge: {
    ...typography.caption,
    fontWeight: '600',
    lineHeight: 16,
    flexShrink: 0,
    marginTop: spacing[4],
  },
});
