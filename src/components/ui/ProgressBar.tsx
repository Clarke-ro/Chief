import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '@/hooks/useThemeColors';
import { duration, easing, radius, spacing } from '@/theme';

type ProgressBarProps = {
  /** Value from 0 to 1 */
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/** Animated linear progress bar using theme tokens. */
export function ProgressBar({
  progress,
  height = 6,
  color,
  trackColor,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const colors = useThemeColors();
  const clamped = Math.max(0, Math.min(1, progress));
  const animated = useSharedValue(clamped);

  useEffect(() => {
    animated.value = withTiming(clamped, {
      duration: duration.normal,
      easing: easing.emphasized,
    });
  }, [animated, clamped]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, animated.value)) * 100}%`,
  }));

  const percent = Math.round(clamped * 100);

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: trackColor ?? colors.bgSubtle,
          borderRadius: radius.full,
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessibilityLabel={accessibilityLabel ?? `Progress ${percent} percent`}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            backgroundColor: color ?? colors.accent,
            borderRadius: radius.full,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    minWidth: spacing[40],
  },
  fill: {
    minWidth: 0,
  },
});
