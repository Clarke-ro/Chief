import { Download, X } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Typography } from '@/components/ui';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useThemeColors } from '@/hooks/useThemeColors';
import { notifyAlert } from '@/services/confirm';
import { radius, spacing } from '@/theme';

/** Lightweight install CTA for browsers that support install / Add to Home Screen. */
export function PwaInstallPrompt() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { canPromptInstall, needsManualInstall, dismissed, isInstalled, promptInstall, dismiss } =
    usePwaInstall();

  if (Platform.OS !== 'web' || isInstalled || dismissed) return null;
  if (!canPromptInstall && !needsManualInstall) return null;

  const onInstall = async () => {
    if (needsManualInstall) {
      notifyAlert(
        'Add Chief to Home Screen',
        'Tap Share, then “Add to Home Screen” to install Chief.',
      );
      return;
    }
    await promptInstall();
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, spacing[12]) + spacing[8],
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <Download size={18} color={colors.accent} strokeWidth={2.25} />
        <View style={styles.copy}>
          <Typography variant="callout">Install Chief</Typography>
          <Typography variant="caption" color="secondary">
            {needsManualInstall
              ? 'Add to your Home Screen for a full-screen app.'
              : 'Open as an app with offline-ready shell.'}
          </Typography>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss install prompt"
          onPress={dismiss}
          hitSlop={10}
          style={styles.dismiss}
        >
          <X size={16} color={colors.textTertiary} strokeWidth={2.25} />
        </Pressable>
      </View>
      <Button size="sm" onPress={() => void onInstall()} style={styles.cta}>
        {needsManualInstall ? 'How to install' : 'Install'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing[16],
    right: spacing[16],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing[12],
    gap: spacing[8],
    zIndex: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  copy: {
    flex: 1,
    gap: spacing[2],
  },
  dismiss: {
    padding: spacing[2],
  },
  cta: {
    alignSelf: 'stretch',
  },
});
