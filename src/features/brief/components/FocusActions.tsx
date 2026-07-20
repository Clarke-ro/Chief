import { ScrollView, StyleSheet, View } from 'react-native';

import { AppChip } from '@/components/ui/AppChip';
import type { FocusAction } from '@/features/brief/types';
import { spacing } from '@/theme';

type FocusActionsProps = {
  actions: FocusAction[];
  onActionPress?: (action: FocusAction) => void;
};

/** Horizontal action chips for a focus item (Ask Chief, draft, reschedule, …). */
export function FocusActions({ actions, onActionPress }: FocusActionsProps) {
  if (actions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}
    >
      {actions.map((action) => (
        <View key={action.id} style={styles.chipWrap}>
          <AppChip
            label={action.label}
            tone={action.tone ?? 'neutral'}
            size="sm"
            onPress={() => onActionPress?.(action)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
    marginTop: spacing[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingRight: spacing[8],
  },
  chipWrap: {
    flexShrink: 0,
  },
});
