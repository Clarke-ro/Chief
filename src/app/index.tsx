import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureSessionBoot, usePreferencesStore, useSessionBootStore } from '@/stores';

/**
 * App entry — wait for durable session restore, then route by auth + onboarding.
 * Home requires a live session; onboardingCompleted alone is not enough.
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

  return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
