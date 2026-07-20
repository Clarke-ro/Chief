import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlatformIcon } from '@/components/ui';
import type { BackendIntegrationProvider } from '@/config/integrations/providerMap';
import { PROFILE_MANAGE_APPS } from '@/features/profile/mapLiveConnectedApps';
import type { ConnectedApp } from '@/features/profile/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { connectIntegration } from '@/services/integrations/connectIntegration';
import { fontFamily, radius, spacing, typography } from '@/theme';

type ConnectMoreAppsSheetProps = {
  visible: boolean;
  onClose: () => void;
  apps: ConnectedApp[];
  workspaceId?: string;
  onConnected: () => Promise<void> | void;
};

/** In-app slide-up to connect extra integrations from Profile (not onboarding). */
export function ConnectMoreAppsSheet({
  visible,
  onClose,
  apps,
  workspaceId,
  onConnected,
}: ConnectMoreAppsSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const byId = new Map(apps.map((app) => [app.id, app]));

  const handleConnect = async (appId: string, provider: BackendIntegrationProvider) => {
    if (connectingId) return;
    setConnectingId(appId);
    try {
      const result = await connectIntegration(provider, workspaceId);
      await onConnected();
      if (result.ok) {
        return;
      }
      if (result.reason === 'failed' && result.message) {
        Alert.alert('Connect failed', result.message);
      }
    } catch {
      Alert.alert('Connect failed', 'Could not start OAuth. Check your connection and try again.');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderSubtle,
              paddingBottom: Math.max(insets.bottom, spacing[16]),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={[styles.heading, { color: colors.text }]}>Connect more</Text>
              <Text style={[styles.subheading, { color: colors.textSecondary }]}>
                Add apps so Chief can pull more context into your day.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: colors.bgSubtle,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {PROFILE_MANAGE_APPS.map((item) => {
              const live = byId.get(item.id);
              const connected = Boolean(live?.connected);
              const needsReauth = Boolean(live?.needsReauth);
              const busy = connectingId === item.id;

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    connected
                      ? needsReauth
                        ? `Reconnect ${item.name}`
                        : `${item.name} connected`
                      : `Connect ${item.name}`
                  }
                  disabled={busy || (connected && !needsReauth)}
                  onPress={() => {
                    if (connected && !needsReauth) return;
                    void handleConnect(item.id, item.provider);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: colors.bgSubtle,
                      borderColor: colors.borderSubtle,
                      opacity: pressed && !(connected && !needsReauth) ? 0.85 : 1,
                    },
                  ]}
                >
                  <PlatformIcon platform={item.platform} size={40} />
                  <View style={styles.rowCopy}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
                      {busy
                        ? 'Opening sign-in…'
                        : connected && needsReauth
                          ? 'Reconnect required'
                          : connected
                            ? live?.accountLabel
                              ? `Connected · ${live.accountLabel}`
                              : 'Connected'
                            : 'Not connected'}
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : connected && !needsReauth ? (
                    <View
                      style={[
                        styles.donePill,
                        { backgroundColor: colors.success + '22' },
                      ]}
                    >
                      <Check size={14} color={colors.success} strokeWidth={2.5} />
                    </View>
                  ) : (
                    <Text style={[styles.actionLabel, { color: colors.accent }]}>
                      {needsReauth ? 'Reconnect' : 'Connect'}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing[8],
    paddingHorizontal: spacing[16],
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing[12],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
    marginBottom: spacing[16],
  },
  headerCopy: {
    flex: 1,
    gap: spacing[4],
  },
  heading: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
  },
  subheading: {
    ...typography.caption,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  list: {
    gap: spacing[12],
    paddingBottom: spacing[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowCopy: {
    flex: 1,
    gap: spacing[2],
  },
  rowTitle: {
    ...typography.body,
    fontFamily: fontFamily.medium,
  },
  rowMeta: {
    ...typography.caption,
  },
  actionLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
  },
  donePill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
