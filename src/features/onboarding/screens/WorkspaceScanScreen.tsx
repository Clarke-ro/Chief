import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppButton, ProgressBar } from '@/components/ui';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureActiveWorkspaceId } from '@/services';
import { briefRepository } from '@/services/repositories/briefRepository';
import { syncRepository } from '@/services/repositories/syncRepository';
import { usePreferencesStore, useWorkspaceStore } from '@/stores';
import { duration, spacing, typography } from '@/theme';

/**
 * Prepare workspace from live sync.
 * Progress bar tracks real sync/brief work — completes when background work finishes.
 */
export function WorkspaceScanScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const refreshBrief = useWorkspaceStore((s) => s.refreshBrief);
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);

  const [progress, setProgress] = useState(0.05);
  const [status, setStatus] = useState('Preparing your workspace…');
  const [error, setError] = useState<string | null>(null);
  const [canContinue, setCanContinue] = useState(false);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const workspaceId = await ensureActiveWorkspaceId();
        const prep = await syncRepository.prepareWorkspace(workspaceId, {
          timeoutMs: 90_000,
          pollMs: 2000,
          onProgress: ({ progress: next, label }) => {
            setProgress(next);
            setStatus(label);
          },
        });

        setProgress(0.88);
        setStatus('Composing your brief…');
        await refreshBrief();
        let brief = useWorkspaceStore.getState().brief;

        const until = Date.now() + 20_000;
        while (
          Date.now() < until &&
          brief.focus.length === 0 &&
          brief.briefing.length === 0
        ) {
          await sleep(1500);
          await refreshBrief();
          brief = useWorkspaceStore.getState().brief;
        }

        briefRepository.persistCache(brief, workspaceId);

        if (brief.focus.length > 0 || brief.briefing.length > 0) {
          setProgress(1);
          setReady(true);
          setStatus('Workspace ready');
          setCanContinue(true);
          return;
        }

        setProgress(1);
        setStatus(
          prep.ready
            ? 'Sync finished — Chief will keep learning as more mail arrives.'
            : 'Taking longer than usual — you can continue and refresh on Home.',
        );
        setCanContinue(true);
      } catch (err) {
        setProgress(1);
        setError(
          err instanceof Error ? err.message : 'Could not prepare workspace',
        );
        setCanContinue(true);
      }
    })();
  }, [refreshBrief]);

  return (
    <OnboardingShell
      stepIndex={3}
      footer={
        canContinue ? (
          <AppButton
            size="lg"
            onPress={() => {
              if (ready) {
                router.replace('/onboarding/brief');
                return;
              }
              completeOnboarding();
              router.replace('/home');
            }}
          >
            {ready ? 'Show my brief' : 'Continue to Home'}
          </AppButton>
        ) : null
      }
    >
      <View style={styles.content}>
        <OnboardingCopy
          eyebrow="Chief is working"
          title="Preparing your workspace."
          body="Initial sync, relevance scoring, and your first brief — Home will open with your real data."
        />

        <View style={styles.meter}>
          <ProgressBar progress={progress} height={4} color={colors.accent} />
          <Animated.Text
            key={status}
            entering={FadeIn.duration(duration.fast)}
            style={[styles.phase, { color: colors.textSecondary }]}
            accessibilityLiveRegion="polite"
          >
            {status}
          </Animated.Text>
          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>
              {error}
            </Text>
          ) : null}
        </View>
      </View>
    </OnboardingShell>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[40],
    width: '100%',
  },
  meter: {
    gap: spacing[12],
    width: '100%',
  },
  phase: {
    ...typography.body,
    marginTop: spacing[8],
  },
  error: {
    ...typography.caption,
  },
});
