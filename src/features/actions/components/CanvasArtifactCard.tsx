import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Copy, Maximize2 } from 'lucide-react-native';

import { AppChip } from '@/components/ui/AppChip';
import { HANDOFF_URLS } from '@/config/handoffUrls';
import {
  canvasHandoffAction,
  canvasKindLabel,
} from '@/features/actions/catalog';
import { openHandoff } from '@/features/actions/executors';
import type { ActionableTask, CanvasKind, HandoffTarget } from '@/features/actions/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

type CanvasArtifactCardProps = {
  task: ActionableTask;
  /** Opens the canvas in a wider / fullscreen panel */
  onExpand?: () => void;
};

function continueTargetFor(task: ActionableTask): HandoffTarget {
  if (task.handoffTarget) return task.handoffTarget;
  const kind = (task.canvasKind ?? 'notes') as CanvasKind;
  if (kind === 'email') return 'gmail';
  if (kind === 'message') return 'slack';
  if (kind === 'schedule') return 'calendar';
  if (kind === 'notes') return 'notion';
  return 'generic';
}

function continueUrlFor(
  task: ActionableTask,
  target: HandoffTarget,
  title: string,
  body: string,
  recipient: string,
): string | undefined {
  if (task.url && target !== 'gmail') return task.url;
  if (target === 'gmail') {
    const subject = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(body);
    const to = recipient ? encodeURIComponent(recipient) : '';
    return `mailto:${to}?subject=${subject}&body=${encodedBody}`;
  }
  if (target === 'slack') return HANDOFF_URLS.slack;
  if (target === 'calendar') return HANDOFF_URLS.calendar;
  if (target === 'notion') return HANDOFF_URLS.notion;
  if (target === 'github') return HANDOFF_URLS.github;
  return task.url;
}

/**
 * Editable canvas artifact — draft fields are live TextInputs.
 * App handoff (Open Gmail, etc.) sits bottom-right inside the card.
 */
export function CanvasArtifactCard({ task, onExpand }: CanvasArtifactCardProps) {
  const colors = useThemeColors();
  const kindLabel = canvasKindLabel(task.canvasKind);
  const handoff = useMemo(() => canvasHandoffAction(task), [task]);
  const target = continueTargetFor(task);
  const showRecipient = task.canvasKind === 'email' || task.canvasKind === 'message';

  const [title, setTitle] = useState(task.title?.trim() || task.label);
  const [recipient, setRecipient] = useState(task.recipient ?? '');
  const [body, setBody] = useState(task.draft ?? '');

  useEffect(() => {
    setTitle(task.title?.trim() || task.label);
    setRecipient(task.recipient ?? '');
    setBody(task.draft ?? '');
  }, [task.id, task.title, task.label, task.recipient, task.draft]);

  const onCopy = async () => {
    const text = [title, recipient ? `To: ${recipient}` : '', '', body]
      .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
      .join('\n')
      .trim();
    try {
      const { copyToClipboard } = await import('@/services/clipboard');
      await copyToClipboard(text);
      Alert.alert('Copied', 'Draft copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Could not copy this draft. Try selecting the text instead.');
    }
  };

  const onOpenApp = async () => {
    const url = continueUrlFor(task, target, title, body, recipient);
    await openHandoff({
      ...task,
      execution: 'handoff',
      handoffTarget: target,
      url,
      title,
      draft: body,
      recipient,
      label: handoff.label,
    });
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.kind, { color: colors.textTertiary }]}>{kindLabel}</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy draft"
            onPress={onCopy}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Copy size={18} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          {onExpand ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Expand canvas"
              onPress={onExpand}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Maximize2 size={18} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showRecipient ? (
        <TextInput
          value={recipient}
          onChangeText={setRecipient}
          placeholder={task.canvasKind === 'message' ? '#channel' : 'recipient@email.com'}
          placeholderTextColor={colors.textTertiary}
          style={[styles.metaInput, { color: colors.textSecondary }]}
          accessibilityLabel={task.canvasKind === 'message' ? 'Channel' : 'To'}
        />
      ) : null}

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.textTertiary}
        style={[styles.titleInput, { color: colors.text }]}
        accessibilityLabel="Title"
      />

      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Write or edit the draft…"
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
        style={[styles.bodyInput, { color: colors.text }]}
        accessibilityLabel="Draft body"
      />

      <View style={styles.footer}>
        <AppChip
          label={handoff.label}
          tone="accent"
          size="md"
          onPress={onOpenApp}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    paddingBottom: spacing[12],
    gap: spacing[8],
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  kind: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaInput: {
    ...typography.footnote,
    paddingVertical: spacing[2],
  },
  titleInput: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
    paddingVertical: spacing[2],
  },
  bodyInput: {
    ...typography.body,
    lineHeight: 24,
    minHeight: 140,
    paddingVertical: spacing[4],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing[8],
  },
});
