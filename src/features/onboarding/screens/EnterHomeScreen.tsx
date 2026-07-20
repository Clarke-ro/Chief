import { useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppButton } from '@/components/ui';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePreferencesStore } from '@/stores';
import { duration, spacing, typography } from '@/theme';

/** Step 6 — handoff into Home. Chief is ready. */
export function EnterHomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);
  const { width } = useWindowDimensions();
  const markSize = width < 360 ? 36 : 40;

  return (
    <OnboardingShell
      stepIndex={5}
      showSkip={false}
      footer={
        <AppButton
          size="lg"
          onPress={() => {
            completeOnboarding();
            router.replace('/home');
          }}
          accessibilityLabel="Enter Home"
        >
          Enter Home
        </AppButton>
      }
    >
      <View style={styles.content}>
        <Animated.Text
          entering={FadeInDown.duration(duration.slow)}
          style={[
            styles.mark,
            { color: colors.text, fontSize: markSize, lineHeight: markSize + 4 },
          ]}
        >
          Chief
        </Animated.Text>
        <OnboardingCopy
          title="Your assistant is ready."
          body="From here, every open starts with a brief. Protect your focus — Chief has the rest."
        />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[32],
    width: '100%',
  },
  mark: {
    ...typography.display,
    letterSpacing: -1,
    fontWeight: '600',
  },
});
