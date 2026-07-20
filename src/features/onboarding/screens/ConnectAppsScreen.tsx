import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { PlatformIcon, type PlatformIconId } from '@/components/ui';
import {
  isOnboardingAppConnected,
  isOnboardingAppSupported,
  providerForOnboardingApp,
} from '@/config/integrations/providerMap';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import type { OnboardingAppId } from '@/features/onboarding/types';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureActiveWorkspaceId } from '@/services/activeWorkspace';
import { connectIntegration } from '@/services/integrations/connectIntegration';
import { onboardingRepository, queryKeys } from '@/services';
import { integrationsRepository } from '@/services/repositories/integrationsRepository';
import { radius, spacing } from '@/theme';

const ONBOARDING_APPS = onboardingRepository.listApps();
const COLS = 3;
const GRID_GAP = spacing[12];

/** Step 3 — connect apps via live OAuth. */
export function ConnectAppsScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [connectingAppId, setConnectingAppId] = useState<OnboardingAppId | null>(null);

  const workspaceQuery = useQuery({
    queryKey: [...queryKeys.root, 'activeWorkspace'],
    queryFn: ensureActiveWorkspaceId,
    retry: 1,
  });

  const workspaceId = workspaceQuery.data;

  const integrationsQuery = useQuery({
    queryKey: queryKeys.integrations(workspaceId),
    queryFn: () => integrationsRepository.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const connectedProviders = useMemo(() => {
    const set = new Set<string>();
    for (const connection of integrationsQuery.data?.connections ?? []) {
      if (connection.status !== 'revoked') {
        set.add(connection.provider);
      }
    }
    return set;
  }, [integrationsQuery.data?.connections]);

  const hasAny = connectedProviders.size > 0;
  const isLight = scheme === 'light';
  const ink = isLight ? '#111113' : colors.text;
  const inkOn = isLight ? '#FFFFFF' : colors.bg;
  const gridWidth = width - spacing[24] * 2;
  const tileSize = (gridWidth - GRID_GAP * (COLS - 1)) / COLS;

  const handleAppPress = async (appId: OnboardingAppId) => {
    if (!isOnboardingAppSupported(appId)) {
      Alert.alert(
        'Coming soon',
        `${ONBOARDING_APPS.find((a) => a.id === appId)?.name ?? 'This app'} is not available yet.`,
      );
      return;
    }

    if (isOnboardingAppConnected(appId, connectedProviders)) {
      return;
    }

    const provider = providerForOnboardingApp(appId);
    if (!provider) return;

    setConnectingAppId(appId);
    try {
      const result = await connectIntegration(provider, workspaceId, {
        next: '/onboarding/connect',
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.integrations(workspaceId) });
      if (result.ok) {
        return;
      }
      if (result.reason === 'failed' && result.message) {
        Alert.alert('Connect failed', result.message);
      }
    } catch {
      Alert.alert('Connect failed', 'Could not start OAuth. Check your connection and try again.');
    } finally {
      setConnectingAppId(null);
    }
  };

  return (
    <OnboardingShell
      stepIndex={2}
      centered={false}
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !hasAny }}
            activeOpacity={0.85}
            disabled={!hasAny}
            onPress={() => router.push('/onboarding/scan')}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: ink,
                opacity: hasAny ? 1 : 0.4,
              },
            ]}
          >
            <Text style={[styles.primaryLabel, { color: inkOn }]}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
            activeOpacity={0.55}
            onPress={() => router.push('/onboarding/scan')}
            style={styles.skipBtn}
          >
            <Text style={[styles.skipLabel, { color: ink }]}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingCopy title="Connect your apps." />

        {workspaceQuery.isLoading || integrationsQuery.isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
          </View>
        ) : null}

        {workspaceQuery.isError ? (
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {workspaceQuery.error instanceof Error &&
            workspaceQuery.error.message === 'Not signed in.'
              ? 'Your session expired. Go back and sign in again.'
              : 'Could not load your workspace. Pull down to reload the app, or go back and sign in again.'}
          </Text>
        ) : null}

        <View style={styles.grid}>
          {ONBOARDING_APPS.map((app) => {
            const isOn = isOnboardingAppConnected(app.id, connectedProviders);
            const isConnecting = connectingAppId === app.id;
            const supported = isOnboardingAppSupported(app.id);

            return (
              <TouchableOpacity
                key={app.id}
                accessibilityRole="button"
                accessibilityState={{ checked: isOn, disabled: !supported || isConnecting }}
                accessibilityLabel={app.name}
                activeOpacity={0.85}
                disabled={!supported || isConnecting || isOn}
                onPress={() => void handleAppPress(app.id)}
                style={[
                  styles.tile,
                  {
                    width: tileSize,
                    backgroundColor: isOn ? colors.accentMuted : colors.bgElevated,
                    borderColor: isOn ? ink : colors.border,
                    opacity: supported ? 1 : 0.45,
                  },
                ]}
              >
                {isConnecting ? (
                  <View style={styles.connecting}>
                    <ActivityIndicator size="small" />
                  </View>
                ) : isOn ? (
                  <View style={[styles.check, { backgroundColor: ink }]}>
                    <Check size={12} color={inkOn} strokeWidth={3} />
                  </View>
                ) : null}
                <PlatformIcon platform={app.platform as PlatformIconId} size={40} />
                <Text style={[styles.tileName, { color: ink }]} numberOfLines={1}>
                  {app.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    gap: spacing[24],
    paddingBottom: spacing[16],
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    minHeight: 108,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: {
    position: 'absolute',
    top: spacing[8],
    right: spacing[8],
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connecting: {
    position: 'absolute',
    top: spacing[8],
    right: spacing[8],
  },
  tileName: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    gap: spacing[12],
  },
  primaryBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: spacing[8],
  },
  skipLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
