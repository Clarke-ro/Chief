import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppChip } from '@/components/ui/AppChip';
import type { PlatformId } from '@/components/ui';
import {
  createScheduleItem,
  formatClockTime,
  normalizeTimeInput,
} from '@/features/tasks/scheduleUtils';
import { matchFocusForTitle } from '@/features/tasks/scheduleSweep';
import type { DayPlanItem } from '@/features/tasks/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorkspaceStore } from '@/stores';
import { fontFamily, radius, spacing, typography } from '@/theme';

const PLATFORMS: { id: PlatformId; label: string }[] = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'gmail', label: 'Gmail' },
  { id: 'slack', label: 'Slack' },
  { id: 'github', label: 'GitHub' },
  { id: 'notion', label: 'Notion' },
  { id: 'asana', label: 'Asana' },
  { id: 'trello', label: 'Trello' },
];

type AddScheduleSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (item: DayPlanItem) => void;
  /** Prefill when editing an existing item */
  initial?: DayPlanItem | null;
};

export function AddScheduleSheet({
  visible,
  onClose,
  onSave,
  initial = null,
}: AddScheduleSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const editing = Boolean(initial);
  const focusItems = useWorkspaceStore((s) => s.brief.focus);
  const focusOptions = useMemo(
    () =>
      [...focusItems].sort((a, b) => {
        const rank = { high: 0, medium: 1, low: 2 };
        return rank[a.priority] - rank[b.priority];
      }),
    [focusItems],
  );

  const [title, setTitle] = useState('');
  const [time, setTime] = useState(formatClockTime());
  const [notes, setNotes] = useState('');
  const [platform, setPlatform] = useState<PlatformId>('calendar');
  const [major, setMajor] = useState(false);
  const [focusId, setFocusId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setTitle(initial.title);
      setTime(initial.time);
      setNotes(initial.subtitle);
      setPlatform(initial.platform);
      setMajor(initial.blockKind === 'major');
      setFocusId(initial.focusId);
    } else {
      setTitle('');
      setTime(formatClockTime());
      setNotes('');
      setPlatform('calendar');
      setMajor(false);
      setFocusId(undefined);
    }
    setError(null);
  }, [visible, initial]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Add a title for this schedule.');
      return;
    }
    if (!normalizeTimeInput(time)) {
      setError('Use a time like 2:30 PM.');
      return;
    }

    const linkedFocus =
      focusId ?? (major ? matchFocusForTitle(trimmed, focusOptions)?.id : undefined);

    if (major && !linkedFocus) {
      setError('Pick a Focus priority for this major block.');
      return;
    }

    const linked = focusOptions.find((f) => f.id === linkedFocus);
    const blockKind = major ? 'major' : 'normal';

    if (initial) {
      onSave({
        ...initial,
        title: trimmed,
        time: normalizeTimeInput(time) ?? initial.time,
        platform: linked?.platform ?? platform,
        subtitle: notes.trim() || initial.subtitle,
        blockKind,
        focusId: major ? linkedFocus : undefined,
        sweepPhase: major ? initial.sweepPhase ?? 'none' : 'none',
      });
    } else {
      onSave(
        createScheduleItem({
          title: trimmed,
          time,
          platform: linked?.platform ?? platform,
          notes,
          blockKind,
          focusId: linkedFocus,
        }),
      );
    }
    onClose();
  };

  const submitLabel = editing ? 'Save' : 'Add';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderSubtle,
              paddingBottom: Math.max(insets.bottom, spacing[16]),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <Text style={[styles.heading, { color: colors.text }]} numberOfLines={1}>
              {editing ? 'Edit schedule' : 'Add schedule'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
              onPress={submit}
              hitSlop={8}
              style={({ pressed }) => [
                styles.textAction,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.textActionLabel, { color: colors.textSecondary }]}>
                {submitLabel}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.form}
          >
            <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
            <TextInput
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (error) setError(null);
              }}
              placeholder="Meeting, focus block, deadline…"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
              autoFocus={!editing}
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
            <TextInput
              value={time}
              onChangeText={(value) => {
                setTime(value);
                if (error) setError(null);
              }}
              placeholder="2:30 PM"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Source</Text>
            <View style={styles.chips}>
              {PLATFORMS.map((item) => (
                <AppChip
                  key={item.id}
                  label={item.label}
                  size="sm"
                  tone={platform === item.id ? 'accent' : 'neutral'}
                  selected={platform === item.id}
                  onPress={() => setPlatform(item.id)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Block type</Text>
            <View style={styles.chips}>
              <AppChip
                label="Normal"
                size="sm"
                tone={!major ? 'accent' : 'neutral'}
                selected={!major}
                onPress={() => {
                  setMajor(false);
                  setFocusId(undefined);
                }}
              />
              <AppChip
                label="Major · Focus"
                size="sm"
                tone={major ? 'accent' : 'neutral'}
                selected={major}
                onPress={() => setMajor(true)}
              />
            </View>

            {major ? (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Linked Focus priority
                </Text>
                <View style={styles.chips}>
                  {focusOptions.map((focus) => (
                    <AppChip
                      key={focus.id}
                      label={focus.title}
                      size="sm"
                      wrap
                      tone={focusId === focus.id ? 'accent' : 'neutral'}
                      selected={focusId === focus.id}
                      onPress={() => {
                        setFocusId(focus.id);
                        setPlatform(focus.platform);
                        if (error) setError(null);
                      }}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional detail"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                styles.notes,
                {
                  color: colors.text,
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
              multiline
            />

            {error ? (
              <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onClose}
              style={({ pressed }) => [
                styles.textAction,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.textActionLabel, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '90%',
    paddingTop: spacing[8],
    // Column: form scrolls, footer stays put
    flexDirection: 'column',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
    paddingHorizontal: spacing[20],
    marginBottom: spacing[8],
    minHeight: 44,
  },
  heading: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    flexShrink: 1,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  form: {
    paddingHorizontal: spacing[20],
    gap: spacing[8],
    paddingBottom: spacing[16],
  },
  label: {
    ...typography.footnote,
    fontFamily: fontFamily.medium,
    marginTop: spacing[4],
  },
  input: {
    ...typography.body,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    minHeight: 44,
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  error: {
    ...typography.footnote,
  },
  footer: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  textActionLabel: {
    ...typography.subhead,
    fontFamily: fontFamily.medium,
  },
});
