import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { ThemeSync } from '@/components/ThemeSync';
import { CanvasPanelHost } from '@/features/actions/components/CanvasPanelHost';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { queryClient } from '@/services/queryClient';
import { ensureSessionBoot } from '@/stores';
import { lightColors } from '@/theme/colors';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const colorScheme = useResolvedColorScheme();
  const fontsReady = useAppFonts();

  useEffect(() => {
    void ensureSessionBoot();
  }, []);

  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return (
      <View style={[styles.root, styles.boot]}>
        <ActivityIndicator color={lightColors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeSync />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <OfflineBanner />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              gestureEnabled: true,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="integrations/callback" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="focus/[id]"
              options={{
                animation: 'slide_from_right',
                presentation: 'card',
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="task/[id]"
              options={{
                animation: 'slide_from_right',
                presentation: 'card',
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="canvas/[taskId]"
              options={{
                headerShown: false,
                animation: 'fade',
                gestureEnabled: false,
              }}
            />
          </Stack>
          <PwaInstallPrompt />
          <CanvasPanelHost />
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.bg,
  },
});
