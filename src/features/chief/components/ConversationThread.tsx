import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ActionableTaskCard,
  CanvasArtifactCard,
  resolveActionableTask,
  type ActionableTask,
} from '@/features/actions';
import { ChatMarkdownText } from '@/features/chief/components/ChatMarkdownText';
import { ChiefLogo } from '@/features/chief/components/ChiefLogo';
import { ChiefThinking } from '@/features/chief/components/ChiefThinking';
import type { ConversationTurn } from '@/features/chief/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useCanvasStore } from '@/stores';
import { fontFamily, radius, spacing, typography } from '@/theme';

type ConversationThreadProps = {
  turns: ConversationTurn[];
  onAction?: (task: ActionableTask) => void;
  /** Show pulsing Chief logo while a reply is loading. */
  thinking?: boolean;
};

type TurnProps = {
  turn: ConversationTurn;
  onAction?: (task: ActionableTask) => void;
};

const UserTurn = memo(function UserTurn({ turn }: { turn: ConversationTurn }) {
  const colors = useThemeColors();
  return (
    <View style={styles.userRow}>
      <View style={[styles.userBubble, { backgroundColor: colors.bgSubtle }]}>
        <Text style={[styles.userText, { color: colors.text }]}>{turn.content}</Text>
      </View>
    </View>
  );
});

const ChiefTurn = memo(function ChiefTurn({ turn, onAction }: TurnProps) {
  const colors = useThemeColors();
  const openCanvas = useCanvasStore((s) => s.open);
  const tasks = useMemo(
    () => (turn.actions ?? []).map((action) => resolveActionableTask(action)),
    [turn.actions],
  );
  const lead = turn.actionsLead?.trim() || 'Next steps';

  return (
    <View style={styles.chiefBlock}>
      <View style={styles.chiefRow}>
        <View style={styles.avatar}>
          <ChiefLogo size={28} />
        </View>
        <View style={styles.chiefContent}>
          {turn.content ? <ChatMarkdownText content={turn.content} /> : null}
        </View>
      </View>

      {turn.canvas ? (
        <View style={styles.canvasWrap}>
          <CanvasArtifactCard
            task={turn.canvas}
            onExpand={() => {
              if (turn.canvas) openCanvas(turn.canvas, 'fullscreen');
            }}
          />
        </View>
      ) : null}

      {tasks.length > 0 ? (
        <View style={styles.actions} collapsable={false}>
          <Text style={[styles.actionsLead, { color: colors.textSecondary }]}>{lead}</Text>
          <View style={styles.actionRow} collapsable={false}>
            {tasks.map((task) => (
              <ActionableTaskCard
                key={task.id}
                task={task}
                onPress={() => onAction?.(task)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
});

/**
 * Chat flow with optional canvas artifact cards.
 * Canvas sits full-width under the reply so it isn’t squeezed by avatar indent.
 */
export function ConversationThread({
  turns,
  onAction,
  thinking = false,
}: ConversationThreadProps) {
  if (turns.length === 0 && !thinking) return null;

  return (
    <View style={styles.wrap} accessibilityRole="text">
      {turns.map((turn) =>
        turn.role === 'user' ? (
          <UserTurn key={turn.id} turn={turn} />
        ) : (
          <ChiefTurn key={turn.id} turn={turn} onAction={onAction} />
        ),
      )}
      {thinking ? <ChiefThinking /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[12],
    paddingTop: spacing[16],
    gap: spacing[24],
    width: '100%',
    alignSelf: 'center',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '88%',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.xl,
    borderBottomRightRadius: radius.sm,
  },
  userText: {
    ...typography.body,
    lineHeight: 24,
  },
  chiefBlock: {
    gap: spacing[12],
  },
  chiefRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  avatar: {
    width: 28,
    height: 28,
    marginTop: 2,
  },
  chiefContent: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  canvasWrap: {
    width: '100%',
  },
  actions: {
    gap: spacing[8],
    paddingLeft: 28 + spacing[8],
    width: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
  },
  actionsLead: {
    ...typography.footnote,
    fontFamily: fontFamily.regular,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    gap: spacing[8],
    width: '100%',
    minWidth: 0,
  },
});
