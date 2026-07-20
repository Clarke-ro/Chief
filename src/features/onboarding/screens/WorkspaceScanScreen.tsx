import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppButton, ProgressBar } from '@/components/ui';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useThemeColors } from '@/hooks/useThemeColors';
import { onboardingRepository } from '@/services';
import { duration, spacing, typography } from '@/theme';

const PHASES = [
  'Reading your calendar…',
  'Listening for urgent threads…',
  'Prioritizing commitments…',
  'Drafting today’s brief…',
] as const;

type Beat = 'scanning' | 'insight';

function pickInsight(connected: Set<string>) {
  const insights = onboardingRepository.listScanInsights();
  const match = insights.find((insight) => {
    if (!insight.requires?.length) return false;
    return insight.requires.every((id) => connected.has(id));
  });
  return match ?? insights.find((i) => i.id === 'fallback') ?? insights[0];
}

/** Step 4 — scan, then a defining insight before the first brief. */
export function WorkspaceScanScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const connected = useOnboardingStore((s) => s.connected);
  const insight = useMemo(() => pickInsight(connected), [connected]);

  const [beat, setBeat] = useState<Beat>('scanning');
  const [phase, setPhase] = useState(0);
  const progress = (phase + 1) / PHASES.length;

  useEffect(() => {
    if (beat !== 'scanning') return;

    if (phase >= PHASES.length - 1) {
      const reveal = setTimeout(() => setBeat('insight'), 700);
      return () => clearTimeout(reveal);
    }
    const tick = setTimeout(() => setPhase((p) => p + 1), 1100);
    return () => clearTimeout(tick);
  }, [beat, phase]);

  if (beat === 'insight') {
    return (
      <OnboardingShell
        stepIndex={3}
        footer={
          <AppButton size="lg" onPress={() => router.replace('/onboarding/brief')}>
            Show my brief
          </AppButton>
        }
      >
        <Animated.View
          entering={FadeIn.duration(duration.normal)}
          style={styles.insightWrap}
          accessibilityRole="summary"
          accessibilityLabel={`${insight.headline}. ${insight.detail}`}
        >
          <Text style={[styles.insightEyebrow, { color: colors.textTertiary }]}>
            Chief noticed
          </Text>
          <Animated.Text
            entering={FadeInDown.delay(120).duration(duration.slow)}
            style={[styles.insightHeadline, { color: colors.text }]}
          >
            {insight.headline}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(280).duration(duration.normal)}
            style={[styles.insightDetail, { color: colors.textSecondary }]}
          >
            {insight.detail}
          </Animated.Text>
        </Animated.View>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell stepIndex={3}>
      <View style={styles.content}>
        <OnboardingCopy
          eyebrow="Chief is working"
          title="Scanning your workspace."
          body="A quiet pass across the tools you connected — only what shapes today."
        />

        <View style={styles.meter}>
          <ProgressBar progress={progress} height={4} color={colors.accent} />
          <Animated.Text
            key={PHASES[phase]}
            entering={FadeIn.duration(duration.fast)}
            style={[styles.phase, { color: colors.textSecondary }]}
            accessibilityLiveRegion="polite"
          >
            {PHASES[phase]}
          </Animated.Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[40],
    width: '100%',
  },
  meter: {
    gap: spacing[16],
    width: '100%',
    maxWidth: 360,
  },
  phase: {
    ...typography.callout,
  },
  insightWrap: {
    gap: spacing[20],
    maxWidth: 400,
    width: '100%',
    paddingBottom: spacing[16],
  },
  insightEyebrow: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  insightHeadline: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.7,
  },
  insightDetail: {
    ...typography.callout,
    lineHeight: 24,
    maxWidth: 340,
  },
});
