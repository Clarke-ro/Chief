import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { MarketingHomeScreen } from '@/features/marketing';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureSessionBoot, usePreferencesStore, useSessionBootStore } from '@/stores';

/**
 * App entry — public homepage for logged-out visitors (Google OAuth brand checks).
 * Authenticated users route into the product.
 */
export default function Index() {
  const colors = useThemeColors();
  const onboardingCompleted = usePreferencesStore((s) => s.onboardingCompleted);
  const ready = useSessionBootStore((s) => s.ready);
  const hasSession = useSessionBootStore((s) => s.hasSession);

  useEffect(() => {
    void ensureSessionBoot();
  }, []);

  if (!ready) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (hasSession && onboardingCompleted) {
    return <Redirect href="/home" />;
  }

  if (hasSession) {
    return <Redirect href="/onboarding/connect" />;
  }

  // Public homepage — must name “Chief”, explain purpose, link Privacy/Terms.
  return <MarketingHomeScreen />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
