import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlatformLogo } from '@/components/ui/PlatformLogo';
import type { BriefingSignal } from '@/features/brief/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type BriefingSignalRowProps = {
  item: BriefingSignal;
  onPress?: () => void;
};

/** One update block along a Brief section thread rail — tap to expand/collapse. */
export function BriefingSignalRow({ item, onPress }: BriefingSignalRowProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    setExpanded((prev) => !prev);
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${item.title}. ${item.summary}. ${expanded ? 'Collapse' : 'Expand'} details`}
      onPress={toggle}
      style={({ pressed }) => [styles.block, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <PlatformLogo platform={item.platform} size={22} />
        <Text
          style={[styles.headline, { color: colors.text }]}
          numberOfLines={expanded ? undefined : 2}
        >
          {item.title}
        </Text>
        {expanded ? (
          <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
        ) : (
          <ChevronRight size={14} color={colors.textTertiary} strokeWidth={2} />
        )}
      </View>

      <Text
        style={[styles.detail, { color: colors.textSecondary }]}
        numberOfLines={expanded ? undefined : 2}
      >
        {item.summary}
      </Text>

      <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{item.timestamp}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing[8],
  },
  pressed: { opacity: 0.72 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  headline: {
    ...typography.footnote,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
    minWidth: 0,
  },
  detail: {
    ...typography.caption,
    lineHeight: 18,
    paddingLeft: 22 + spacing[8],
  },
  timestamp: {
    ...typography.caption,
    paddingLeft: 22 + spacing[8],
  },
});
