import { MessageSquare } from 'lucide-react-native';
import { useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui';
import { AchievementsSection } from '@/features/analytics/components/AchievementsSection';
import { AiImpactSection } from '@/features/analytics/components/AiImpactSection';
import { PerformanceSection } from '@/features/analytics/components/PerformanceSection';
import { ProductivitySection } from '@/features/analytics/components/ProductivitySection';
import { WeeklyTrendsSection } from '@/features/analytics/components/WeeklyTrendsSection';
import { WorkBreakdownSection } from '@/features/analytics/components/WorkBreakdownSection';
import { useThemeColors } from '@/hooks/useThemeColors';
import { dispatchAction } from '@/features/actions';
import { workspaceNav } from '@/services';
import { useWorkspaceStore } from '@/stores';
import { spacing } from '@/theme';

/** Analytics tab — retrospective value of how you work with Chief. */
export function AnalyticsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const data = useWorkspaceStore((s) => s.analytics);
  const bottomPad = insets.bottom + (Platform.OS === 'ios' ? 88 : 24);

  const askChief = useCallback(() => {
    void dispatchAction({
      kind: 'ask',
      prompt: workspaceNav.analyticsPrompt(
        Math.round(data.productivity.score * 100),
        data.productivity.insight,
      ),
      source: 'analytics',
    });
  }, [data.productivity.insight, data.productivity.score]);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.viewport}>
          <AppHeader
            title="Analytics"
            subtitle="How you work, improve, and how much Chief creates."
            actions={[
              {
                icon: MessageSquare,
                label: 'Ask Chief about analytics',
                onPress: askChief,
              },
            ]}
          />

          <View style={styles.sections}>
            <ProductivitySection data={data.productivity} />
            <AiImpactSection metrics={data.aiImpact} />
            <WorkBreakdownSection categories={data.workBreakdown} />
            <PerformanceSection metrics={data.performance} />
            <WeeklyTrendsSection series={data.weeklyTrends} />
            <AchievementsSection achievements={data.achievements} />
          </View>

          <View style={{ height: spacing[24] }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  viewport: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  sections: {
    gap: spacing[24],
    paddingTop: spacing[8],
  },
});
