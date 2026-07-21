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
import { useWorkspaceStore } from '@/stores';
import { duration, spacing, typography } from '@/theme';

const PHASES = [
  'Connecting to your apps…',
  'Pulling mail, calendar, and tasks…',
  'Scoring what deserves attention…',
  'Building your first brief…',
] as const;

/**
 * Step 4 — prepare workspace from live sync (no mock scan).
 * Waits until brief has real content (or timeout), then continues.
 */
export function WorkspaceScanScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const refreshBrief = useWorkspaceStore((s) => s.refreshBrief);

  const [phase, setPhase] = useState(0);
  const [status, setStatus] = useState('Preparing your workspace…');
  const [error, setError] = useState<string | null>(null);
  const [canContinue, setCanContinue] = useState(false);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  const progress = Math.min(1, (phase + 1) / PHASES.length);

  useEffect(() => {
    const tick = setInterval(() => {
      setPhase((p) => (p < PHASES.length - 1 ? p + 1 : p));
    }, 2200);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const workspaceId = await ensureActiveWorkspaceId();
        setStatus('Syncing connected apps…');
        const prep = await syncRepository.prepareWorkspace(workspaceId, {
          timeoutMs: 90_000,
          pollMs: 2000,
        });

        setStatus('Composing your brief…');
        // Force a fresh compose after sync (brief may have been empty/stale).
        await refreshBrief();
        let brief = useWorkspaceStore.getState().brief;

        // Poll brief briefly if sync finished but compose raced.
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
          setReady(true);
          setStatus('Workspace ready');
          setCanContinue(true);
          return;
        }

        setStatus(
          prep.ready
            ? 'Sync finished — Chief will keep learning as more mail arrives.'
            : 'Taking longer than usual — you can continue and refresh on Home.',
        );
        setCanContinue(true);
      } catch (err) {
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
            onPress={() =>
              router.replace(ready ? '/onboarding/brief' : '/onboarding/ready')
            }
          >
            {ready ? 'Show my brief' : 'Continue'}
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
            key={PHASES[phase]}
            entering={FadeIn.duration(duration.fast)}
            style={[styles.phase, { color: colors.textSecondary }]}
            accessibilityLiveRegion="polite"
          >
            {PHASES[phase]}
          </Animated.Text>
          <Text style={[styles.status, { color: colors.textTertiary }]}>{status}</Text>
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
  status: {
    ...typography.caption,
  },
  error: {
    ...typography.caption,
  },
});
