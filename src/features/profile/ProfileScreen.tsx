import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, PlugZap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, EmptyState } from '@/components/ui';
import type { BackendIntegrationProvider } from '@/config/integrations/providerMap';
import { dispatchAction } from '@/features/actions';
import { ConnectMoreAppsSheet } from '@/features/profile/components/ConnectMoreAppsSheet';
import { ConnectedAppsGrid } from '@/features/profile/components/ConnectedAppsGrid';
import { ProfileIdentity } from '@/features/profile/components/ProfileIdentity';
import { ProfileSectionLabel } from '@/features/profile/components/ProfileSectionLabel';
import { SettingRow } from '@/features/profile/components/SettingRow';
import { SettingsGroup } from '@/features/profile/components/SettingsGroup';
import { mapLiveConnectedApps } from '@/features/profile/mapLiveConnectedApps';
import type { ConnectedApp } from '@/features/profile/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureActiveWorkspaceId } from '@/services/activeWorkspace';
import { confirmAction, notifyAlert } from '@/services/confirm';
import {
  connectIntegration,
  reconnectIntegration,
} from '@/services/integrations/connectIntegration';
import { clearUserSession, queryKeys, workspaceNav } from '@/services';
import { briefRepository } from '@/services/repositories/briefRepository';
import { integrationsRepository } from '@/services/repositories/integrationsRepository';
import { syncRepository } from '@/services/repositories/syncRepository';
import {
  usePreferencesStore,
  useSessionBootStore,
  useWorkspaceStore,
  type ThemePreference,
} from '@/stores';
import { spacing, typography } from '@/theme';

function askFromProfile(prompt: string) {
  void dispatchAction({ kind: 'ask', prompt, source: 'profile' });
}

const THEME_OPTIONS: { id: ThemePreference; title: string; subtitle: string }[] = [
  { id: 'light', title: 'Light', subtitle: 'Bright surfaces and dark text' },
  { id: 'dark', title: 'Dark', subtitle: 'Dim surfaces and light text' },
  { id: 'system', title: 'System', subtitle: 'Match your device setting' },
];

/** Profile — account, connections, theme, and notifications. */
export function ProfileScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const themePref = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [connectSheetOpen, setConnectSheetOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const profile = useWorkspaceStore((s) => s.profile);
  const applyUserIdentity = useWorkspaceStore((s) => s.applyUserIdentity);
  const notifications = profile.notifications;
  const setNotificationEnabled = useWorkspaceStore((s) => s.setNotificationEnabled);
  const refreshBrief = useWorkspaceStore((s) => s.refreshBrief);
  const me = useSessionBootStore((s) => s.me);

  useEffect(() => {
    if (!me?.user) return;
    applyUserIdentity({
      name: me.user.name,
      email: me.user.email,
      image: me.user.image,
    });
  }, [applyUserIdentity, me]);

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

  const connectedApps = useMemo(
    () =>
      mapLiveConnectedApps(
        integrationsQuery.data?.connections,
        integrationsQuery.data?.providers,
      ),
    [integrationsQuery.data?.connections, integrationsQuery.data?.providers],
  );

  const toggleNotification = useCallback(
    (id: string, next: boolean) => {
      setNotificationEnabled(id, next);
    },
    [setNotificationEnabled],
  );

  const invalidateIntegrations = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.integrations(workspaceId) });
  }, [queryClient, workspaceId]);

  const clearStaleBrief = useCallback(async () => {
    briefRepository.clearCache(workspaceId);
    try {
      await refreshBrief();
    } catch {
      /* keep empty / cache-cleared state */
    }
  }, [refreshBrief, workspaceId]);

  const runConnect = useCallback(
    async (provider: BackendIntegrationProvider, appId: string) => {
      const app = connectedApps.find((a) => a.id === appId);
      if (app?.configured === false) {
        notifyAlert(
          'Not available',
          `${app.name} is not configured on the server yet.`,
        );
        return;
      }
      setBusyAppId(appId);
      try {
        const result = await connectIntegration(provider, workspaceId, {
          next: '/profile',
        });
        await invalidateIntegrations();
        if (result.ok) {
          if (workspaceId) {
            void syncRepository.runFirstConnection(workspaceId).catch(() => {});
          }
        } else if (result.reason === 'failed' && result.message) {
          notifyAlert('Connect failed', result.message);
        }
      } catch {
        notifyAlert('Connect failed', 'Could not start OAuth. Check your connection and try again.');
      } finally {
        setBusyAppId(null);
      }
    },
    [connectedApps, invalidateIntegrations, workspaceId],
  );

  const runReconnect = useCallback(
    async (app: ConnectedApp) => {
      const provider = app.provider as BackendIntegrationProvider | undefined;
      if (!provider || !app.connectionId) {
        notifyAlert('Reconnect failed', 'No live connection id for this app.');
        return;
      }
      setBusyAppId(app.id);
      try {
        const result = await reconnectIntegration(
          app.connectionId,
          provider,
          workspaceId,
          { next: '/profile' },
        );
        await invalidateIntegrations();
        if (result.ok) {
          if (workspaceId) {
            void syncRepository.runFirstConnection(workspaceId).catch(() => {});
          }
        } else if (result.reason === 'failed' && result.message) {
          notifyAlert('Reconnect failed', result.message);
        }
      } catch {
        notifyAlert(
          'Reconnect failed',
          'Could not start OAuth. Check your connection and try again.',
        );
      } finally {
        setBusyAppId(null);
      }
    },
    [invalidateIntegrations, workspaceId],
  );

  const runDisconnect = useCallback(
    async (app: ConnectedApp) => {
      if (!workspaceId) {
        notifyAlert('Disconnect failed', 'Workspace is still loading. Try again in a moment.');
        return;
      }
      if (!app.connectionId) {
        notifyAlert('Disconnect failed', 'No live connection id for this app.');
        return;
      }
      setBusyAppId(app.id);
      try {
        await integrationsRepository.disconnect(app.connectionId, workspaceId);
        await invalidateIntegrations();
        await clearStaleBrief();
      } catch {
        notifyAlert('Disconnect failed', 'Could not disconnect this app. Try again.');
      } finally {
        setBusyAppId(null);
      }
    },
    [clearStaleBrief, invalidateIntegrations, workspaceId],
  );

  const handleAppPress = useCallback(
    async (app: ConnectedApp) => {
      if (busyAppId) return;
      const provider = app.provider as BackendIntegrationProvider | undefined;
      if (!provider) return;

      if (app.connected && app.needsReauth) {
        const ok = await confirmAction({
          title: `Reconnect ${app.name}?`,
          message: app.accountLabel
            ? `${app.accountLabel} needs to sign in again.`
            : 'This connection expired. Sign in again to keep using it.',
          confirmLabel: 'Reconnect',
        });
        if (ok) void runReconnect(app);
        return;
      }

      if (app.connected) {
        const disconnectTitle =
          app.provider === 'google' ? 'Disconnect Google?' : `Disconnect ${app.name}?`;
        const disconnectBody =
          app.provider === 'google'
            ? 'This removes Gmail, Calendar, and Tasks access for Chief.'
            : app.accountLabel
              ? `Connected as ${app.accountLabel}.\nChief only reads what you allow.`
              : 'Chief only reads what you allow.';
        const ok = await confirmAction({
          title: disconnectTitle,
          message: disconnectBody,
          confirmLabel: 'Disconnect',
          destructive: true,
        });
        if (ok) void runDisconnect(app);
        return;
      }

      if (app.configured === false) {
        notifyAlert(
          'Not available',
          `${app.name} is not configured on the server yet.`,
        );
        return;
      }

      const ok = await confirmAction({
        title: `Connect ${app.name}?`,
        message: 'Chief will open a secure sign-in in your browser.',
        confirmLabel: 'Connect',
      });
      if (ok) void runConnect(provider, app.id);
    },
    [busyAppId, runConnect, runDisconnect, runReconnect],
  );

  const handleLogOut = useCallback(async () => {
    if (loggingOut) return;
    const ok = await confirmAction({
      title: 'Log out?',
      message: 'This clears your session and local Chief data on this device.',
      confirmLabel: 'Log out',
      destructive: true,
    });
    if (!ok) return;

    setLoggingOut(true);
    try {
      const result = await clearUserSession();
      router.replace('/onboarding');
      if (!result.authCleared) {
        notifyAlert(
          'Signed out locally',
          'Secure credentials could not be cleared. Try again if sign-in issues persist.',
        );
      }
    } catch {
      notifyAlert(
        'Could not finish log out',
        'Local data may be partially cleared. Restart the app if anything looks stuck.',
      );
      router.replace('/onboarding');
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, router]);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '1';

  const bottomPad = insets.bottom + (Platform.OS === 'ios' ? 88 : 24);
  const appsLoading = workspaceQuery.isLoading || integrationsQuery.isLoading;
  const appsError = integrationsQuery.isError;
  const anyConnected = connectedApps.some((a) => a.connected);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.viewport}>
          <AppHeader
            title="Profile"
            subtitle="Account, Chief, and connected services."
          />

          <View style={styles.identity}>
            <ProfileIdentity user={profile.user} />
          </View>

          <View style={styles.stack}>
            <View style={styles.plainBlock}>
              <ProfileSectionLabel
                title="Connected Apps"
                description="Where Chief gets context for your day."
              />
              {appsLoading ? (
                <View style={styles.appsLoading}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : appsError ? (
                <EmptyState
                  icon={PlugZap}
                  title="Couldn't load apps"
                  description="Check your connection and try again."
                  actionLabel="Retry"
                  onAction={() => {
                    void integrationsQuery.refetch();
                  }}
                />
              ) : (
                <>
                  <ConnectedAppsGrid
                    apps={connectedApps}
                    onAppPress={handleAppPress}
                    onConnectMore={() => setConnectSheetOpen(true)}
                  />
                  {!anyConnected ? (
                    <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                      No apps connected yet. Tap Add to connect Gmail, Slack, GitHub, or Notion.
                    </Text>
                  ) : null}
                </>
              )}
              {busyAppId ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.busyText, { color: colors.textSecondary }]}>
                    Updating connection…
                  </Text>
                </View>
              ) : null}
            </View>

            <ConnectMoreAppsSheet
              visible={connectSheetOpen}
              onClose={() => setConnectSheetOpen(false)}
              apps={connectedApps}
              workspaceId={workspaceId}
              onConnected={invalidateIntegrations}
            />

            <SettingsGroup
              title="Chief"
              description="How your assistant thinks and plans with you."
            >
              <SettingRow
                title="AI Preferences"
                onPress={() =>
                  askFromProfile(
                    'Help me tune how you prioritize my day and when you interrupt me.',
                  )
                }
              />
              <SettingRow
                title="Daily Brief Settings"
                onPress={() => workspaceNav.home()}
              />
              <SettingRow
                title="Working Hours"
                onPress={() =>
                  askFromProfile(
                    'Help me set working hours so you schedule deep work correctly.',
                  )
                }
              />
              <SettingRow
                title="Focus Hours"
                onPress={() =>
                  askFromProfile(
                    'Help me protect focus hours on my Today schedule.',
                  )
                }
                isLast
              />
            </SettingsGroup>

            <SettingsGroup
              title="Notifications"
              description="Choose what reaches you — and what stays quiet."
            >
              {notifications.map((item, index) => (
                <SettingRow
                  key={item.id}
                  title={item.label}
                  switchValue={item.enabled}
                  onSwitchChange={(next) => toggleNotification(item.id, next)}
                  showChevron={false}
                  isLast={index === notifications.length - 1}
                />
              ))}
            </SettingsGroup>

            <SettingsGroup
              title="Appearance"
              description="Light and dark modes apply across Home, Today, Chief, and more."
            >
              {THEME_OPTIONS.map((option, index) => {
                const selected = themePref === option.id;
                return (
                  <SettingRow
                    key={option.id}
                    title={option.title}
                    subtitle={option.subtitle}
                    showChevron={false}
                    onPress={() => setTheme(option.id)}
                    trailing={
                      selected ? (
                        <Check size={18} color={colors.accent} strokeWidth={2.5} />
                      ) : undefined
                    }
                    isLast={index === THEME_OPTIONS.length - 1}
                  />
                );
              })}
            </SettingsGroup>

            <SettingsGroup title="Support">
              <SettingRow
                title="Send Feedback"
                onPress={() => askFromProfile('I have feedback about Chief: ')}
              />
              <SettingRow
                title="Feature Requests"
                onPress={() => askFromProfile('Feature request: ')}
                isLast
              />
            </SettingsGroup>

            <SettingsGroup>
              <SettingRow
                title={loggingOut ? 'Signing out…' : 'Log Out'}
                destructive
                showChevron={false}
                onPress={() => {
                  void handleLogOut();
                }}
                isLast
              />
            </SettingsGroup>

            <Text style={[styles.version, { color: colors.textTertiary }]}>
              Chief {version} · Build {build}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  viewport: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  identity: {
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
  },
  stack: {
    gap: spacing[16],
    paddingTop: spacing[12],
    paddingBottom: spacing[24],
  },
  plainBlock: {
    paddingHorizontal: spacing[16],
  },
  appsLoading: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing[12],
    lineHeight: 18,
    paddingHorizontal: spacing[8],
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingTop: spacing[12],
  },
  busyText: {
    ...typography.caption,
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing[20],
    paddingTop: spacing[8],
  },
});
