import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FocusActions } from '@/features/brief/components/FocusActions';
import type { FocusAction, FocusItem } from '@/features/brief/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { typography } from '@/theme';

type FocusRowProps = {
  item: FocusItem;
  onPress?: () => void;
  onActionPress?: (action: FocusAction) => void;
};

/** Drop "Est. N min" from the reason — time already shows in the card badge. */
function reasonWithoutEstimate(reason: string): string {
  return reason
    .replace(/(?:\s*[·•|—–\-]\s*)?Est\.\s*\d+\s*min\b/gi, '')
    .replace(/\s*[·•|—–\-]\s*$/g, '')
    .trim();
}

/** Focus reason (single-line ellipsis) + context-specific action chips. */
export function FocusRow({ item, onPress, onActionPress }: FocusRowProps) {
  const colors = useThemeColors();
  const reason = reasonWithoutEstimate(item.reason);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${reason}. ${item.priority} priority`}
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Text style={[styles.summary, { color: colors.text }]} numberOfLines={1}>
          {reason}
        </Text>
      </Pressable>
      <FocusActions actions={item.actions} onActionPress={onActionPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 0,
  },
  pressed: { opacity: 0.72 },
  summary: {
    ...typography.caption,
    lineHeight: 16,
  },
});
