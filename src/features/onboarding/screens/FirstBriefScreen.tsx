import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui';
import { BriefingSignalRow } from '@/features/brief/components/BriefingSignalRow';
import type { BriefingSignal } from '@/features/brief/types';
import { ChiefLogo } from '@/features/chief/components/ChiefLogo';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePreferencesStore, useWorkspaceStore } from '@/stores';
import { fontFamily, radius, spacing, typography } from '@/theme';

const SECTION_ORDER = [
  'Needs Attention',
  'Security',
  'Finance',
  'Career',
  'Meetings',
  'Projects',
  'Updates',
  'Focus',
] as const;

function groupSignals(signals: BriefingSignal[]) {
  const groups: { section: string; items: BriefingSignal[] }[] = [];
  for (const item of signals) {
    const section = item.section?.trim() || 'Updates';
    const group = groups.find((g) => g.section === section);
    if (group) group.items.push(item);
    else groups.push({ section, items: [item] });
  }
  groups.sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.section as (typeof SECTION_ORDER)[number]);
    const bi = SECTION_ORDER.indexOf(b.section as (typeof SECTION_ORDER)[number]);
    return (ai === -1 ? SECTION_ORDER.length : ai) - (bi === -1 ? SECTION_ORDER.length : bi);
  });
  return groups;
}

/** First brief — scrollable thread preview styled like Home, with a unique onboarding frame. */
export function FirstBriefScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);
  const brief = useWorkspaceStore((s) => s.brief);

  const signals = useMemo(() => {
    const fromBriefing = brief.briefing;
    if (fromBriefing.length > 0) return fromBriefing;

    return brief.focus.map(
      (item): BriefingSignal => ({
        id: item.id,
        platform: item.platform,
        title: item.title,
        summary: item.reason,
        timestamp: item.estimatedTime,
        section: 'Focus',
      }),
    );
  }, [brief.briefing, brief.focus]);

  const groups = useMemo(() => groupSignals(signals), [signals]);
  const totalCount = signals.length;

  const enterHome = () => {
    completeOnboarding();
    router.replace('/home');
  };

  return (
    <OnboardingShell
      stepIndex={4}
      centered={false}
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
            totalCount > 0
              ? 'Here’s what matters today.'
              : 'Your workspace is ready.'
          }
          body={
            totalCount > 0
              ? 'Scroll the thread — this is how Chief surfaces your day every morning.'
              : 'As important mail and meetings arrive, they’ll show here and on Home.'
          }
        />

        <View
          style={[
            styles.frame,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.frameHeader}>
            <View style={styles.brandRow}>
              <ChiefLogo size={22} />
              <View style={styles.brandCopy}>
                <Text style={[styles.frameEyebrow, { color: colors.accent }]}>Chief brief</Text>
                <Text style={[styles.frameTitle, { color: colors.text }]}>Today’s thread</Text>
              </View>
            </View>
            {totalCount > 0 ? (
              <View style={[styles.countPill, { backgroundColor: colors.accentMuted }]}>
                <Text style={[styles.countText, { color: colors.accent }]}>
                  {totalCount} {totalCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
            ) : null}
          </View>

          {groups.length > 0 ? (
            <View style={styles.groups}>
              {groups.map((group) => (
                <View key={group.section} style={styles.group}>
                  <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
                    {group.section}
                  </Text>
                  <View style={[styles.thread, { borderLeftColor: colors.accent }]}>
                    {group.items.map((signal, index) => (
                      <View key={signal.id} style={styles.threadItem}>
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor: colors.accent,
                              borderColor: colors.bgElevated,
                            },
                          ]}
                        />
                        <BriefingSignalRow item={signal} />
                        {index < group.items.length - 1 ? (
                          <View
                            style={[styles.itemRule, { backgroundColor: colors.borderSubtle }]}
                          />
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              As important mail and meetings arrive, they’ll show in this thread on Home.
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
  frame: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing[16],
    paddingBottom: spacing[12],
    overflow: 'hidden',
    width: '100%',
  },
  frameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    flex: 1,
    minWidth: 0,
  },
  brandCopy: {
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  frameEyebrow: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  frameTitle: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
  },
  countPill: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  countText: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
  },
  groups: {
    gap: spacing[20],
  },
  group: {
    gap: spacing[8],
  },
  groupTitle: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[16],
  },
  thread: {
    marginLeft: spacing[20],
    marginRight: spacing[16],
    borderLeftWidth: 2,
    paddingLeft: spacing[16],
    gap: spacing[4],
  },
  threadItem: {
    position: 'relative',
    paddingVertical: spacing[8],
  },
  dot: {
    position: 'absolute',
    left: -(spacing[16] + 5),
    top: spacing[12],
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  itemRule: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing[8],
    marginLeft: 22 + spacing[8],
  },
  emptyBody: {
    ...typography.body,
    lineHeight: 24,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    minHeight: 100,
  },
});
