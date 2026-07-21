import { BarChart3 } from 'lucide-react-native';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, EmptyState } from '@/components/ui';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/theme';

/** Analytics tab — coming soon (no mock charts). */
export function AnalyticsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + (Platform.OS === 'ios' ? 88 : 24);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          backgroundColor: colors.bg,
          paddingBottom: bottomPad,
        },
      ]}
    >
      <View style={styles.viewport}>
        <AppHeader
          title="Analytics"
          subtitle="How you work with Chief — insights coming soon."
        />
        <EmptyState
          icon={BarChart3}
          title="Coming soon"
          description="Productivity trends, AI impact, and weekly retrospectives will live here. Keep using Home and Today — Chief is already learning from your schedule."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  viewport: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingBottom: spacing[24],
  },
});
