import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePreferencesStore } from '@/stores';

/** Onboarding stack — follows the user’s theme preference (default light). */
export default function OnboardingLayout() {
  const onboardingCompleted = usePreferencesStore((s) => s.onboardingCompleted);
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();

  // Returning users who hit /onboarding (deep link / back stack) land on Home.
  if (onboardingCompleted) {
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
