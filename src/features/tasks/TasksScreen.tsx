import { usePathname } from 'expo-router';
import { ActionSheetIOS, Alert, AppState, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, Plus, Search as SearchIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchBar } from '@/components/ui';
import { dispatchAction } from '@/features/actions';
import { AddScheduleSheet } from '@/features/tasks/components/AddScheduleSheet';
import { TimelineRow } from '@/features/tasks/components/TimelineRow';
import { nextStatus } from '@/features/tasks/scheduleUtils';
import type { DayPlanItem } from '@/features/tasks/types';
import { useMountedRef } from '@/hooks/useMountedRef';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { workspaceNav } from '@/services';
import { useWorkspaceStore } from '@/stores';
import { fontFamily, radius, spacing, typography } from '@/theme';

function filterDayPlan(items: DayPlanItem[], query: string): DayPlanItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) =>
    `${item.title} ${item.subtitle} ${item.time}`.toLowerCase().includes(normalized),
  );
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Today — interactive day schedule. */
export function TasksScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();
  const mounted = useMountedRef();
  const pathname = usePathname();
  const isTodayFocused = pathname === '/tasks' || pathname.endsWith('/tasks');
  const items = useWorkspaceStore((s) => s.dayPlan);
  const addItem = useWorkspaceStore((s) => s.addDayPlanItem);
  const updateItem = useWorkspaceStore((s) => s.updateDayPlanItem);
  const removeItem = useWorkspaceStore((s) => s.removeDayPlanItem);
  const setStatus = useWorkspaceStore((s) => s.setDayPlanStatus);
  const runDueSweep = useWorkspaceStore((s) => s.runDueSweep);
  const resetToSeed = useWorkspaceStore((s) => s.resetDayPlan);

  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<DayPlanItem | null>(null);

  // Due-time sweep only while Today is focused — avoids background JS work on other tabs
  useEffect(() => {
    if (!isTodayFocused) return;
    runDueSweep();
    const tick = setInterval(() => runDueSweep(), 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runDueSweep();
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
  }, [isTodayFocused, runDueSweep]);


  const activeQuery = showSearch ? query : '';
  const scheduleItems = useMemo(
    () => filterDayPlan(items, activeQuery),
    [activeQuery, items],
  );

  const emphasizeId = useMemo(
    () => scheduleItems.find((item) => item.status === 'upcoming')?.id,
    [scheduleItems],
  );

  const openAdd = useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((item: DayPlanItem) => {
    setEditing(item);
    setSheetOpen(true);
  }, []);

  const onSave = (item: DayPlanItem) => {
    if (editing) {
      updateItem(item.id, item);
    } else {
      addItem(item);
    }
  };

  const presentItemActions = useCallback(
    (item: DayPlanItem) => {
      const markLabel =
        item.status === 'completed'
          ? 'Mark upcoming'
          : item.status === 'in_progress'
            ? 'Mark complete'
            : 'Mark in progress';

      const run = (key: string) => {
        if (key === 'status') setStatus(item.id, nextStatus(item.status));
        if (key === 'edit') openEdit(item);
        if (key === 'ask') {
          void dispatchAction({
            kind: 'ask',
            prompt: workspaceNav.schedulePrompt(item),
            source: 'schedule',
            focusId: item.focusId,
          });
        }
        if (key === 'delete') {
          Alert.alert('Remove schedule?', item.title, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => removeItem(item.id),
            },
          ]);
        }
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [markLabel, 'Ask Chief', 'Edit', 'Remove', 'Cancel'],
            destructiveButtonIndex: 3,
            cancelButtonIndex: 4,
            userInterfaceStyle: scheme,
          },
          (index) => {
            if (index === 0) run('status');
            if (index === 1) run('ask');
            if (index === 2) run('edit');
            if (index === 3) run('delete');
          },
        );
        return;
      }

      Alert.alert(item.title, undefined, [
        { text: markLabel, onPress: () => run('status') },
        { text: 'Ask Chief', onPress: () => run('ask') },
        { text: 'Edit', onPress: () => run('edit') },
        { text: 'Remove', style: 'destructive', onPress: () => run('delete') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [openEdit, removeItem, scheme, setStatus],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    if (!mounted.current) return;
    // Keep user-added items; only re-seed if the list is empty
    if (useWorkspaceStore.getState().dayPlan.length === 0) {
      resetToSeed();
    }
    runDueSweep();
    if (mounted.current) setRefreshing(false);
  }, [mounted, resetToSeed, runDueSweep]);

  const toggleSearch = () => {
    setShowSearch((prev) => {
      if (prev) setQuery('');
      return !prev;
    });
  };

  const bottomPad = insets.bottom + (Platform.OS === 'ios' ? 88 : 24);

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 72 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.viewport} collapsable={false}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerTitleBlock}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Today"
                  style={styles.headerTitleBtn}
                >
                  <Text style={[styles.title, { color: colors.text }]}>Today</Text>
                  <ChevronDown size={20} color={colors.text} strokeWidth={2.25} />
                </Pressable>
                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                  {todayLabel()}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toggle search"
                  hitSlop={8}
                  onPress={toggleSearch}
                  style={styles.iconBtn}
                >
                  <SearchIcon
                    size={22}
                    color={showSearch ? colors.accent : colors.text}
                    strokeWidth={2}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add schedule"
                  hitSlop={8}
                  onPress={openAdd}
                  style={[styles.addHeaderBtn, { backgroundColor: colors.text }]}
                >
                  <Plus size={18} color={colors.bg} strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>
          </View>

          {showSearch ? (
            <View style={styles.searchWrap}>
              <SearchBar value={query} onChangeText={setQuery} placeholder="Search schedule" />
            </View>
          ) : null}

          <View style={styles.mainSection} collapsable={false}>
            {scheduleItems.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {activeQuery ? 'No matches' : 'Nothing scheduled'}
                </Text>
                <Text style={[styles.empty, { color: colors.textTertiary }]}>
                  {activeQuery
                    ? 'Try a different search.'
                    : 'Add a meeting, focus block, or deadline for today.'}
                </Text>
                {!activeQuery ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={openAdd}
                    style={[styles.emptyCta, { backgroundColor: colors.accent }]}
                  >
                    <Text style={[styles.emptyCtaLabel, { color: '#FFFFFF' }]}>Add schedule</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.timeline}>
                {scheduleItems.map((item, index) => (
                  <TimelineRow
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                    isLast={index === scheduleItems.length - 1}
                    emphasize={item.id === emphasizeId}
                    onPress={() => presentItemActions(item)}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add schedule"
        onPress={openAdd}
        style={[
          styles.fab,
          {
            backgroundColor: colors.text,
            bottom: bottomPad,
          },
        ]}
      >
        <Plus size={24} color={colors.bg} strokeWidth={2.5} />
      </Pressable>

      <AddScheduleSheet
        visible={sheetOpen}
        initial={editing}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        onSave={onSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: spacing[8],
  },
  viewport: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[12],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[16],
  },
  headerTitleBlock: {
    gap: spacing[2],
  },
  headerTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  title: { ...typography.title1, letterSpacing: -0.5 },
  dateLabel: {
    ...typography.footnote,
    fontFamily: fontFamily.medium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingTop: spacing[4],
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[8],
  },
  mainSection: {
    paddingTop: spacing[4],
    minHeight: 200,
  },
  emptyWrap: {
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[32],
    gap: spacing[8],
    alignItems: 'flex-start',
  },
  emptyTitle: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
  },
  empty: {
    ...typography.footnote,
    lineHeight: 18,
  },
  emptyCta: {
    marginTop: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
  },
  emptyCtaLabel: {
    ...typography.subhead,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
  },
  timeline: {
    position: 'relative',
    minHeight: 200,
  },
  fab: {
    position: 'absolute',
    right: spacing[20],
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
