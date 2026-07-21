import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ChiefLogo } from '@/features/chief/components/ChiefLogo';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing, typography } from '@/theme';

/** Pulsing Chief mark shown while a reply is in flight. */
export function ChiefThinking() {
  const colors = useThemeColors();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.92 + pulse.value * 0.08 }],
  }));

  return (
    <View
      style={styles.row}
      accessibilityLiveRegion="polite"
      accessibilityLabel="Chief is thinking"
    >
      <Animated.View style={[styles.avatar, logoStyle]}>
        <ChiefLogo size={28} />
      </Animated.View>
      <Text style={[styles.label, { color: colors.textTertiary }]}>Chief is thinking…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[12],
    paddingTop: spacing[8],
  },
  avatar: {
    width: 28,
    height: 28,
  },
  label: {
    ...typography.footnote,
  },
});
