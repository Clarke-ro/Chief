import { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useThemeColors';
import { authSession } from '@/services/api/authSession';
import { usePreferencesStore } from '@/stores';
import { radius, spacing, typography } from '@/theme';

type OnboardingShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  /** 0-based step index for progress */
  stepIndex?: number;
  stepCount?: number;
  /** Vertically center body content (welcome / auth). Off for scrollable steps. */
  centered?: boolean;
  /** Show Skip → Home. Defaults on for setup steps. */
  showSkip?: boolean;
  /** Show back control when the stack can pop. Defaults on after step 0. */
  showBack?: boolean;
};

/** Mobile-first chrome shared by every onboarding step — theme-aware. */
export function OnboardingShell({
  children,
  footer,
  stepIndex,
  stepCount = 6,
  centered = true,
  showSkip = true,
  showBack,
}: OnboardingShellProps) {
  const colors = useThemeColors();
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const canBack = showBack ?? (stepIndex != null && stepIndex > 0);
  const progress =
    stepIndex != null && stepCount > 0 ? (stepIndex + 1) / stepCount : 0;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top + spacing[12],
          paddingBottom: Math.max(insets.bottom, spacing[16]),
        },
      ]}
    >
      <View style={styles.topBar}>
        <View style={styles.topLeading}>
          {canBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: colors.bgSubtle,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
        </View>

        {showSkip ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip to Home"
            onPress={() => {
              void (async () => {
                const signedIn = await authSession.isSignedIn();
                if (!signedIn) {
                  router.replace('/onboarding/auth');
                  return;
                }
                completeOnboarding();
                router.replace('/home');
              })();
            }}
            hitSlop={12}
            style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1 }]}
          >
            <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      {stepIndex != null ? (
        <View
          style={[styles.track, { backgroundColor: colors.borderSubtle }]}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: stepCount,
            now: stepIndex + 1,
          }}
        >
          <View
            style={[
              styles.trackFill,
              {
                flex: progress,
                backgroundColor: colors.accent,
              },
            ]}
          />
          <View style={{ flex: Math.max(0.0001, 1 - progress) }} />
        </View>
      ) : null}

      <View style={[styles.body, centered && styles.bodyCentered]}>{children}</View>

      {footer ? (
        <View style={[styles.footer, { backgroundColor: colors.bg }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing[24],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: spacing[16],
  },
  topLeading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 40,
    height: 40,
  },
  skip: {
    ...typography.subhead,
    fontWeight: '600',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing[24],
    flexDirection: 'row',
    width: '100%',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyCentered: {
    justifyContent: 'center',
  },
  footer: {
    flexShrink: 0,
    gap: spacing[12],
    paddingTop: spacing[16],
    width: '100%',
  },
});
