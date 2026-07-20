import { StyleSheet, View } from 'react-native';

import { AppChip } from '@/components/ui/AppChip';
import type { ActionableTask } from '@/features/actions/types';

type ActionableTaskCardProps = {
  task: ActionableTask;
  onPress: () => void;
  /** Match Focus: accent for primary CTAs, neutral otherwise */
  tone?: 'neutral' | 'accent';
};

/**
 * Chat / canvas action chip — same `AppChip` wrapping as Focus section actions.
 */
export function ActionableTaskCard({
  task,
  onPress,
  tone = 'neutral',
}: ActionableTaskCardProps) {
  return (
    <View style={styles.wrap} collapsable={false}>
      <AppChip
        label={task.label}
        tone={tone}
        size="md"
        wrap
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexShrink: 1,
    minWidth: 0,
  },
});
