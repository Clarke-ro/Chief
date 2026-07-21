import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, PriorityIndicator } from '@/components/ui';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePreferencesStore, useWorkspaceStore } from '@/stores';
import { fontFamily, radius, spacing, typography } from '@/theme';

/** First daily brief — shown in the same canvas card chrome used across the app. */
export function FirstBriefScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);
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

  const enterHome = () => {
    completeOnboarding();
    router.replace('/home');
  };

  return (
    <OnboardingShell
      stepIndex={4}
      centered={false}
      showSkip={false}
      footer={
        <AppButton size="lg" onPress={enterHome}>
          Enter Home
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

        <View
          style={[
            styles.canvas,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.canvasHeader}>
            <Text style={[styles.kind, { color: colors.textTertiary }]}>Notes</Text>
          </View>
          <Text style={[styles.canvasTitle, { color: colors.text }]}>
            {items.length > 0 ? 'What matters today' : 'Your workspace is ready'}
          </Text>

          {items.length > 0 ? (
            <View style={styles.itemStack}>
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
          ) : (
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              As important mail and meetings arrive, they’ll show here and on Home.
            </Text>
          )}
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    gap: spacing[20],
    paddingBottom: spacing[8],
  },
  canvas: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
    width: '100%',
    gap: spacing[8],
  },
  canvasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  kind: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    textTransform: 'capitalize',
  },
  canvasTitle: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
    paddingVertical: spacing[2],
  },
  itemStack: {
    marginTop: spacing[4],
  },
  item: {
    paddingVertical: spacing[12],
    gap: spacing[4],
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  itemTitle: {
    ...typography.body,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    flex: 1,
  },
  itemReason: {
    ...typography.caption,
    lineHeight: 18,
  },
  emptyBody: {
    ...typography.body,
    lineHeight: 24,
    paddingVertical: spacing[8],
    minHeight: 100,
  },
});
