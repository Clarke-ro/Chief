import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureSessionBoot, usePreferencesStore, useSessionBootStore } from '@/stores';

/** Onboarding stack — follows the user’s theme preference (default light). */
export default function OnboardingLayout() {
  const onboardingCompleted = usePreferencesStore((s) => s.onboardingCompleted);
  const ready = useSessionBootStore((s) => s.ready);
  const hasSession = useSessionBootStore((s) => s.hasSession);
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();

  useEffect(() => {
    void ensureSessionBoot();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Only bounce completed users to Home when they still have a live session.
  if (onboardingCompleted && hasSession) {
    return <Redirect href="/home" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.bg, flex: 1 },
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="connect" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="brief" />
        <Stack.Screen name="ready" />
      </Stack>
    </View>
  );
}
