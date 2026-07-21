import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BriefingSignal } from '@/features/brief/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing, typography } from '@/theme';

type BriefingSignalRowProps = {
  item: BriefingSignal;
  onPress?: () => void;
};

/** One update block along a Brief section thread rail. */
export function BriefingSignalRow({ item, onPress }: BriefingSignalRowProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.summary}`}
      onPress={onPress}
      style={({ pressed }) => [styles.block, pressed && styles.pressed]}
    >
      <Text style={[styles.summary, { color: colors.text }]} numberOfLines={1}>
        {item.summary}
      </Text>

      <View style={styles.titleRow}>
        <Text style={[styles.actionTitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.title}
        </Text>
        <ChevronRight size={14} color={colors.textTertiary} strokeWidth={2} />
        <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{item.timestamp}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing[8],
  },
  pressed: { opacity: 0.72 },
  summary: {
    ...typography.footnote,
    lineHeight: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  actionTitle: {
    ...typography.caption,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  timestamp: {
    ...typography.caption,
    marginLeft: 'auto',
    flexShrink: 0,
  },
});
