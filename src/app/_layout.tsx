import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeSync } from '@/components/ThemeSync';
import { CanvasPanelHost } from '@/features/actions/components/CanvasPanelHost';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { queryClient } from '@/services/queryClient';
import { ensureSessionBoot } from '@/stores';

export default function RootLayout() {
  const colorScheme = useResolvedColorScheme();

  useEffect(() => {
    void ensureSessionBoot();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeSync />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
});
