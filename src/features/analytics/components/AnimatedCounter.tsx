import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { typography } from '@/theme';

type AnimatedCounterProps = {
  value: number;
  durationMs?: number;
  decimals?: number;
  suffix?: string;
  style?: TextStyle;
};

/** Counts up into view — used for AI Impact metrics. */
export function AnimatedCounter({
  value,
  durationMs = 900,
  decimals = 0,
  suffix = '',
  style,
}: AnimatedCounterProps) {
  const colors = useThemeColors();
  const pathname = usePathname();
  const isAnalyticsFocused =
    pathname === '/analytics' || pathname.endsWith('/analytics');
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isAnalyticsFocused) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, isAnalyticsFocused]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-US');

  return (
    <Text style={[styles.value, { color: colors.text }, style]} accessibilityRole="text">
      {formatted}
      {suffix}
    </Text>
  );
}

const styles = StyleSheet.create({
  value: {
    ...typography.title1,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
});
