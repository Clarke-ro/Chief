import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FocusActions } from '@/features/brief/components/FocusActions';
import type { FocusAction, FocusItem } from '@/features/brief/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { typography } from '@/theme';

type FocusRowProps = {
  item: FocusItem;
  /** Opens the focus detail screen (title / chevron). */
  onOpenDetail?: () => void;
  onActionPress?: (action: FocusAction) => void;
};

/** Focus reason + context-specific action chips — tap body to expand/collapse. */
export function FocusRow({ item, onOpenDetail, onActionPress }: FocusRowProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${item.title}. ${item.reason}. ${expanded ? 'Collapse' : 'Expand'} details`}
        onPress={() => setExpanded((prev) => !prev)}
        onLongPress={onOpenDetail}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Text
          style={[styles.summary, { color: colors.text }]}
          numberOfLines={expanded ? undefined : 2}
        >
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
    lineHeight: 18,
  },
});
