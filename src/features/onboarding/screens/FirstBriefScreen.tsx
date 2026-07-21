import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, PriorityIndicator } from '@/components/ui';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorkspaceStore } from '@/stores';
import { radius, spacing, typography } from '@/theme';

/** Step 5 — first daily brief from the live/cached workspace (not mock). */
export function FirstBriefScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const brief = useWorkspaceStore((s) => s.brief);

  const items = useMemo(() => {
    if (brief.focus.length > 0) {
      return brief.focus.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        reason: item.reason,
        priority: item.priority,
      }));
    }
    return brief.briefing.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      reason: item.summary,
      priority: 'medium' as const,
    }));
  }, [brief.briefing, brief.focus]);

  return (
    <OnboardingShell
      stepIndex={4}
      centered={false}
      footer={
        <AppButton size="lg" onPress={() => router.push('/onboarding/ready')}>
          Continue
        </AppButton>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingCopy
          eyebrow="Your first brief"
          title={
            items.length > 0
              ? 'Here’s what matters today.'
              : 'Your workspace is ready.'
          }
          body={
            items.length > 0
              ? 'Chief distilled your connected apps into actionable priorities — this is how every morning starts.'
              : 'As important mail and meetings arrive, they’ll show here and on Home.'
          }
        />

        {items.length > 0 ? (
          <View
            style={[
              styles.list,
              { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle },
            ]}
          >
            {items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.item,
                  index < items.length - 1 && {
                    borderBottomColor: colors.borderSubtle,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.itemTop}>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <PriorityIndicator priority={item.priority} />
                </View>
                <Text style={[styles.itemReason, { color: colors.textSecondary }]}>
                  {item.reason}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    gap: spacing[24],
    paddingBottom: spacing[8],
  },
  list: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[16],
    overflow: 'hidden',
  },
  item: {
    paddingVertical: spacing[14],
    gap: spacing[6],
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  itemTitle: {
    ...typography.bodyStrong,
    flex: 1,
  },
  itemReason: {
    ...typography.caption,
  },
});
