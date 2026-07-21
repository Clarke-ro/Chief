import { Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ConfidenceIndicator,
  EmptyState,
  PlatformLogo,
  PriorityBadge,
  Tag,
  platformLabels,
} from '@/components/ui';
import type { Task } from '@/features/tasks/types';
import { TASK_STATUS_LABELS } from '@/features/tasks/types';
import { useMountedRef } from '@/hooks/useMountedRef';
import { useThemeColors } from '@/hooks/useThemeColors';
import { taskRepository, workspaceNav } from '@/services';
import { spacing, typography } from '@/theme';

function paramId(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function statusTone(status: string): 'neutral' | 'accent' | 'success' | 'warning' {
  switch (status) {
    case 'done':
      return 'success';
    case 'in_progress':
      return 'accent';
    case 'waiting':
      return 'warning';
    default:
      return 'neutral';
  }
}

export default function TaskDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = paramId(params.id);
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const mounted = useMountedRef();
  const [task, setTask] = useState<Task | undefined>(() =>
    id ? taskRepository.getById(id) : undefined,
  );
  const [loading, setLoading] = useState(() => Boolean(id) && !task);
  const goBack = () => workspaceNav.back(() => workspaceNav.today());

  useEffect(() => {
    if (!id) {
      setTask(undefined);
      setLoading(false);
      return;
    }

    const cached = taskRepository.getById(id);
    if (cached) setTask(cached);
    else setLoading(true);

    let cancelled = false;
    void (async () => {
      try {
        const live = await taskRepository.fetchById(id);
        if (cancelled || !mounted.current) return;
        setTask(live);
      } finally {
        if (!cancelled && mounted.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, mounted]);

  if (loading && !task) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
        <EmptyState
          title="Task not found"
          description="This task may have been removed or the link is invalid."
          actionLabel="Back to Today"
          onAction={goBack}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={goBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          <Text style={[styles.backLabel, { color: colors.text }]}>Today</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing[32] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <PlatformLogo platform={task.platform} size={48} />
          <Text style={[styles.platform, { color: colors.textTertiary }]}>
            {platformLabels[task.platform]}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>
          <Text style={[styles.due, { color: colors.textSecondary }]}>{task.dueLabel}</Text>
        </View>

        <View style={[styles.metaBlock, { borderTopColor: colors.borderSubtle }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Priority</Text>
            <PriorityBadge priority={task.priority} />
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Status</Text>
            <Tag label={TASK_STATUS_LABELS[task.status]} tone={statusTone(task.status)} />
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Estimated time</Text>
            <View style={styles.time}>
              <Clock size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.metaValue, { color: colors.text }]}>{task.estimatedTime}</Text>
            </View>
          </View>
          {typeof task.confidence === 'number' ? (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Confidence</Text>
              <ConfidenceIndicator value={task.confidence} />
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{task.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{task.details}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    alignSelf: 'flex-start',
    paddingVertical: spacing[8],
  },
  backLabel: {
    ...typography.subhead,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: spacing[20],
  },
  hero: {
    gap: spacing[8],
    paddingTop: spacing[8],
    paddingBottom: spacing[24],
  },
  platform: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '600',
  },
  title: {
    ...typography.title1,
  },
  due: {
    ...typography.callout,
  },
  metaBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing[8],
    gap: spacing[4],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[12],
  },
  metaLabel: {
    ...typography.footnote,
  },
  metaValue: {
    ...typography.subhead,
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  section: {
    paddingTop: spacing[24],
    gap: spacing[8],
  },
  sectionTitle: {
    ...typography.title3,
  },
  body: {
    ...typography.body,
  },
});
