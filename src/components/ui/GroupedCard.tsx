import { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/theme';

type GroupedCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * WhatsApp / iOS–style grouped list card.
 * Outer shell handles fill + radius; inner content sizes freely so text isn’t clipped.
 */
export function GroupedCard({ children, style, contentStyle }: GroupedCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
        },
        style,
      ]}
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

type InsetSeparatorProps = {
  /** Left inset so the line starts at the label, not under a leading icon */
  inset?: number;
};

/** Hairline divider inset from the left; runs to the card’s right edge. */
export function InsetSeparator({ inset = spacing[16] }: InsetSeparatorProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.separator,
        {
          marginLeft: inset,
          backgroundColor: colors.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    // Avoid overflow:'hidden' — it clips descenders / multi-line text on RN.
  },
  content: {
    width: '100%',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
