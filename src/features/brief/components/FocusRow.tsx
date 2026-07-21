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

/** Focus reason (single-line ellipsis) + context-specific action chips. */
export function FocusRow({ item, onPress, onActionPress }: FocusRowProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.reason}. ${item.priority} priority`}
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Text style={[styles.summary, { color: colors.text }]} numberOfLines={1}>
          {item.reason}
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
