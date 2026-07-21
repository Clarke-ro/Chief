import { WifiOff } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@/components/ui';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/theme';

/** Compact top banner when the device is offline. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          paddingTop: Math.max(insets.top, spacing[8]),
          backgroundColor: colors.warning,
        },
      ]}
    >
      <WifiOff size={14} color="#FFFFFF" strokeWidth={2.25} />
      <Typography variant="caption" style={styles.text}>
        You’re offline — showing saved Chief data where available.
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[8],
    zIndex: 20,
  },
  text: {
    color: '#FFFFFF',
    flex: 1,
  },
});
