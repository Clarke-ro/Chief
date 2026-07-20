import Constants from 'expo-constants';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui';
import type { BackendIntegrationProvider } from '@/config/integrations/providerMap';
import { dispatchAction } from '@/features/actions';
import { ConnectMoreAppsSheet } from '@/features/profile/components/ConnectMoreAppsSheet';
import { ConnectedAppsGrid } from '@/features/profile/components/ConnectedAppsGrid';
import { ProfileIdentity } from '@/features/profile/components/ProfileIdentity';
import { ProfileSectionLabel } from '@/features/profile/components/ProfileSectionLabel';
import { SettingRow } from '@/features/profile/components/SettingRow';
import { SettingsGroup } from '@/features/profile/components/SettingsGroup';
import { SubscriptionBanner } from '@/features/profile/components/SubscriptionBanner';
import { mapLiveConnectedApps } from '@/features/profile/mapLiveConnectedApps';
import type { ConnectedApp } from '@/features/profile/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureActiveWorkspaceId } from '@/services/activeWorkspace';
import { connectIntegration } from '@/services/integrations/connectIntegration';
import { clearUserSession, queryKeys, workspaceNav } from '@/services';
import { integrationsRepository } from '@/services/repositories/integrationsRepository';
import { usePreferencesStore, useWorkspaceStore, type ThemePreference } from '@/stores';
import { spacing, typography } from '@/theme';

function askFromProfile(prompt: string) {
  void dispatchAction({ kind: 'ask', prompt, source: 'profile' });
}

function confirmLogOut() {
  Alert.alert('Log out?', 'This clears your session and local Chief data on this device.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Log out',
      style: 'destructive',
      onPress: () => {
        void clearUserSession()
          .then((result) => {
            workspaceNav.home();
            if (!result.authCleared) {
              Alert.alert(
                'Signed out locally',
                'Secure credentials could not be cleared. Try again if sign-in issues persist.',
              );
            }
          })
          .catch(() => {
            Alert.alert(
              'Could not finish log out',
              'Local data may be partially cleared. Restart the app if anything looks stuck.',
            );
          });
      },
    },
  ]);
}

const THEME_OPTIONS: { id: ThemePreference; title: string; subtitle: string }[] = [
  { id: 'light', title: 'Light', subtitle: 'Bright surfaces and dark text' },
  { id: 'dark', title: 'Dark', subtitle: 'Dim surfaces and light text' },
  { id: 'system', title: 'System', subtitle: 'Match your device setting' },
];

/** Unwired settings stay silent — no placeholder alerts. */
const noop = () => {};

/** Profile — control center with clear section bands, not a dense settings dump. */
export function ProfileScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const themePref = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [connectSheetOpen, setConnectSheetOpen] = useState(false);

  const profile = useWorkspaceStore((s) => s.profile);
  const notifications = profile.notifications;
  const setNotificationEnabled = useWorkspaceStore((s) => s.setNotificationEnabled);

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
    () => mapLiveConnectedApps(integrationsQuery.data?.connections),
    [integrationsQuery.data?.connections],
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

  const runConnect = useCallback(
    async (provider: BackendIntegrationProvider, appId: string) => {
      setBusyAppId(appId);
      try {
        const result = await connectIntegration(provider, workspaceId);
        await invalidateIntegrations();
        if (!result.ok && result.reason === 'failed' && result.message) {
          Alert.alert('Connect failed', result.message);
        }
      } catch {
        Alert.alert('Connect failed', 'Could not start OAuth. Check your connection and try again.');
      } finally {
        setBusyAppId(null);
      }
    },
    [invalidateIntegrations, workspaceId],
  );

  const runDisconnect = useCallback(
    async (app: ConnectedApp) => {
      if (!workspaceId || !app.connectionId) return;
      setBusyAppId(app.id);
      try {
        await integrationsRepository.disconnect(app.connectionId, workspaceId);
        await invalidateIntegrations();
      } catch {
        Alert.alert('Disconnect failed', 'Could not disconnect this app. Try again.');
      } finally {
        setBusyAppId(null);
      }
    },
    [invalidateIntegrations, workspaceId],
  );

  const handleAppPress = useCallback(
    (app: ConnectedApp) => {
      if (busyAppId) return;
      const provider = app.provider as BackendIntegrationProvider | undefined;
      if (!provider) return;

      if (app.connected && app.needsReauth) {
        Alert.alert(
          `Reconnect ${app.name}?`,
          app.accountLabel
            ? `${app.accountLabel} needs to sign in again.`
            : 'This connection expired. Sign in again to keep using it.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reconnect',
              onPress: () => {
                void runConnect(provider, app.id);
              },
            },
          ],
        );
        return;
      }

      if (app.connected) {
        const disconnectTitle =
          app.provider === 'google' ? 'Disconnect Google?' : `Disconnect ${app.name}?`;
        const disconnectBody =
          app.provider === 'google'
            ? 'This removes Gmail and Calendar access for Chief.'
            : app.accountLabel
              ? `Connected as ${app.accountLabel}.\nChief only reads what you allow.`
              : 'Chief only reads what you allow.';
        Alert.alert(disconnectTitle, disconnectBody, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => {
              void runDisconnect(app);
            },
          },
        ]);
        return;
      }

      Alert.alert(`Connect ${app.name}?`, 'Chief will open a secure sign-in in your browser.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: () => {
            void runConnect(provider, app.id);
          },
        },
      ]);
    },
    [busyAppId, runConnect, runDisconnect],
  );

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '1';

  const bottomPad = insets.bottom + (Platform.OS === 'ios' ? 88 : 24);
  const appsLoading = workspaceQuery.isLoading || integrationsQuery.isLoading;

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
            <ProfileIdentity user={profile.user} onEdit={noop} />
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
              ) : (
                <ConnectedAppsGrid
                  apps={connectedApps}
                  onAppPress={handleAppPress}
                  onConnectMore={() => setConnectSheetOpen(true)}
                />
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
              />
              <SettingRow
                title="Language & Region"
                value="English"
                onPress={noop}
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

            <SettingsGroup title="Display">
              <SettingRow
                title="Accent Color"
                value={profile.appearance.accent}
                onPress={noop}
              />
              <SettingRow
                title="App Icon"
                value={profile.appearance.appIcon}
                onPress={noop}
              />
              <SettingRow
                title="Text Size"
                value={profile.appearance.textSize}
                onPress={noop}
                isLast
              />
            </SettingsGroup>

            <SettingsGroup title="Privacy & Security">
              <SettingRow title="Privacy" onPress={noop} />
              <SettingRow title="Security" onPress={noop} />
              <SettingRow title="Biometric Lock" onPress={noop} />
              <SettingRow title="Connected Devices" onPress={noop} />
              <SettingRow
                title="Manage Sessions"
                onPress={() => workspaceNav.chief()}
                isLast
              />
            </SettingsGroup>

            <View style={styles.plainBlock}>
              <ProfileSectionLabel
                title="Subscription"
                description="Your plan and how Chief stays available."
              />
              <SubscriptionBanner
                subscription={profile.subscription}
                onManage={noop}
                onUpgrade={noop}
              />
            </View>

            <SettingsGroup title="Support">
              <SettingRow title="Help Center" onPress={noop} />
              <SettingRow
                title="Send Feedback"
                onPress={() => askFromProfile('I have feedback about Chief: ')}
              />
              <SettingRow
                title="Feature Requests"
                onPress={() => askFromProfile('Feature request: ')}
              />
              <SettingRow title="Privacy Policy" onPress={noop} />
              <SettingRow title="Terms of Service" onPress={noop} />
              <SettingRow title="About Chief" onPress={noop} isLast />
            </SettingsGroup>

            <SettingsGroup>
              <SettingRow
                title="Log Out"
                destructive
                showChevron={false}
                onPress={confirmLogOut}
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
