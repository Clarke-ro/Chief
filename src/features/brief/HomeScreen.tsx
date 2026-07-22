import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight, Inbox, Search as SearchIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dispatchFocusAction } from '@/features/actions';
import { EmptyState, SearchBar } from '@/components/ui';
import { PlatformLogo, type PlatformId } from '@/components/ui/PlatformLogo';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { BriefingSignalRow } from '@/features/brief/components/BriefingSignalRow';
import { FocusRow } from '@/features/brief/components/FocusRow';
import { Greeting } from '@/features/brief/components/Greeting';
import { HomeSection } from '@/features/brief/components/HomeSection';
import { NotificationsInboxSheet } from '@/features/brief/components/NotificationsInboxSheet';
import { SuccessScore } from '@/features/brief/components/SuccessScore';
import type { FocusAction } from '@/features/brief/types';
import { env } from '@/config/env';
import { useMountedRef } from '@/hooks/useMountedRef';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureActiveWorkspaceId, queryKeys, workspaceNav } from '@/services';
import { registerForPushNotifications } from '@/services/notifications/registerPush';
import { notificationsRepository } from '@/services/repositories/notificationsRepository';
import { syncRepository } from '@/services/repositories/syncRepository';
import { useSessionBootStore, useWorkspaceStore } from '@/stores';
import { fontFamily, radius, spacing, typography } from '@/theme';

function formatTodayLabel(date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatSyncAge(iso: string | null): string {
  if (!iso) return 'Not synced yet';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'Synced just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Synced just now';
  if (mins < 60) return `Synced ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.floor(hours / 24)}d ago`;
}

function groupByBriefSection<T extends { section?: string; platform: PlatformId }>(items: T[]) {
  const order = [
    'Needs Attention',
    'Security',
    'Finance',
    'Career',
    'Meetings',
    'Projects',
    'Updates',
  ];
  const groups: { section: string; items: T[] }[] = [];
  for (const item of items) {
    const section = item.section?.trim() || fallbackSection(item.platform);
    const group = groups.find((g) => g.section === section);
    if (group) group.items.push(item);
    else groups.push({ section, items: [item] });
  }
  groups.sort((a, b) => {
    const ai = order.indexOf(a.section);
    const bi = order.indexOf(b.section);
    return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
  });
  return groups;
}

function fallbackSection(platform: PlatformId): string {
  switch (platform) {
    case 'calendar':
      return 'Meetings';
    case 'github':
    case 'notion':
    case 'asana':
    case 'trello':
      return 'Projects';
    case 'slack':
      return 'Needs Attention';
    default:
      return 'Updates';
  }
}

/** Home — AI briefing: "What should I do today?" */
export function HomeScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const mounted = useMountedRef();
  const brief = useWorkspaceStore((s) => s.brief);
  const refreshBrief = useWorkspaceStore((s) => s.refreshBrief);
  const completeFocus = useWorkspaceStore((s) => s.completeFocus);
  const hasSession = useSessionBootStore((s) => s.hasSession);
  const sessionReady = useSessionBootStore((s) => s.ready);
  const me = useSessionBootStore((s) => s.me);
  const applyUserIdentity = useWorkspaceStore((s) => s.applyUserIdentity);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();
  const [unreadCount, setUnreadCount] = useState(0);
  const dateLabel = useMemo(() => formatTodayLabel(), []);
  const greetingName = useMemo(() => {
    const fromSession = me?.user.name?.trim().split(/\s+/)[0];
    if (fromSession) return fromSession;
    return brief.userName?.trim() || 'there';
  }, [brief.userName, me?.user.name]);
  const briefingGroups = useMemo(() => {
    const focusIds = new Set(brief.focus.map((item) => item.id));
    const unique = brief.briefing.filter(
      (signal) =>
        !focusIds.has(signal.id) &&
        !focusIds.has(`mail-${signal.id}`) &&
        !focusIds.has(`event-${signal.id}`),
    );
    return groupByBriefSection(unique);
  }, [brief.briefing, brief.focus]);

  const kickedSync = useRef(false);
  const kickedPush = useRef(false);

  useEffect(() => {
    if (!me?.user) return;
    applyUserIdentity({
      name: me.user.name,
      email: me.user.email,
      image: me.user.image,
    });
  }, [applyUserIdentity, me]);

  useEffect(() => {
    if (!sessionReady || !hasSession) return;
    void ensureActiveWorkspaceId()
      .then((id) => {
        if (mounted.current) setWorkspaceId(id);
      })
      .catch(() => undefined);
  }, [hasSession, mounted, sessionReady]);

  const freshnessQuery = useQuery({
    queryKey: [...queryKeys.root, 'syncFreshness', workspaceId],
    enabled: Boolean(workspaceId) && env.liveHomeBrief && hasSession,
    refetchInterval: 60_000,
    queryFn: () => syncRepository.getFreshness(workspaceId!),
  });

  const unreadQuery = useQuery({
    queryKey: [...queryKeys.root, 'notificationsUnread', workspaceId],
    enabled: Boolean(workspaceId) && env.liveHomeBrief && hasSession,
    refetchInterval: 60_000,
    queryFn: async () => {
      const result = await notificationsRepository.list({
        workspaceId,
        unreadOnly: true,
      });
      return result.unreadCount;
    },
  });

  useEffect(() => {
    if (typeof unreadQuery.data === 'number') {
      setUnreadCount(unreadQuery.data);
    }
  }, [unreadQuery.data]);

  const freshnessLabel = useMemo(() => {
    const data = freshnessQuery.data;
    if (!data) return null;
    if (data.syncing) return 'Syncing…';
    if (data.failed) return 'Sync issue — pull to retry';
    return formatSyncAge(data.lastSyncedAt);
  }, [freshnessQuery.data]);

  // Cache-first: paint cached brief immediately; sync + merge in the background.
  useEffect(() => {
    if (!env.liveHomeBrief || !sessionReady || !hasSession || kickedSync.current) return;
    kickedSync.current = true;
    void (async () => {
      await refreshBrief();
      try {
        const id = await ensureActiveWorkspaceId();
        if (mounted.current) setWorkspaceId(id);
        await syncRepository.runFirstConnection(id);
        await refreshBrief();
      } catch {
        // Keep cached workspace visible.
      }
    })();
  }, [hasSession, mounted, refreshBrief, sessionReady]);

  useEffect(() => {
    if (!env.liveHomeBrief || !sessionReady || !hasSession || kickedPush.current) return;
    kickedPush.current = true;
    void registerForPushNotifications();
  }, [hasSession, sessionReady]);

  const openFocus = useCallback((id: string) => {
    workspaceNav.focus(id);
  }, []);

  const onFocusAction = useCallback(
    (focusId: string, action: FocusAction) => {
      if (action.id.includes('done') || /mark done/i.test(action.label)) {
        void completeFocus(focusId);
        return;
      }
      const focus = brief.focus.find((f) => f.id === focusId);
      void dispatchFocusAction(focus?.title ?? action.label, action, 'home');
    },
    [brief.focus, completeFocus],
  );

  const openAnalytics = useCallback(() => {
    workspaceNav.analytics();
  }, []);

  const openNotifications = useCallback(() => {
    // PWA: RN Modal does not trap focus — close search so taps/typing don't hit SearchBar under the sheet.
    setShowSearch(false);
    setQuery('');
    setInboxOpen(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (env.liveHomeBrief && hasSession) {
        try {
          const id = await ensureActiveWorkspaceId();
          if (mounted.current) setWorkspaceId(id);
          await syncRepository.runFirstConnection(id);
        } catch {
          // Brief refresh still runs with whatever is already persisted.
        }
      }
      await refreshBrief();
      await Promise.all([freshnessQuery.refetch(), unreadQuery.refetch()]);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [freshnessQuery, hasSession, mounted, refreshBrief, unreadQuery]);

  const toggleSearch = () => {
    setShowSearch((prev) => {
      if (prev) setQuery('');
      return !prev;
    });
  };

  const bottomPad = insets.bottom + (Platform.OS === 'ios' ? 88 : 24);
  const badgeCount = unreadCount;

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === 'android'}
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
          <View style={[styles.hero, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.heroTop}>
              <Greeting
                userName={greetingName}
                dateLabel={dateLabel}
                freshnessLabel={env.liveHomeBrief ? freshnessLabel : null}
                actions={
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Search"
                      hitSlop={8}
                      onPress={toggleSearch}
                      style={({ pressed }) => [
                        styles.iconBtn,
                        {
                          backgroundColor: showSearch ? colors.accentMuted : colors.bgElevated,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <SearchIcon
                        size={20}
                        color={showSearch ? colors.accent : colors.text}
                        strokeWidth={2}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        badgeCount > 0
                          ? `Notifications, ${badgeCount} unread`
                          : 'Notifications'
                      }
                      hitSlop={8}
                      onPress={openNotifications}
                      style={({ pressed }) => [
                        styles.iconBtn,
                        {
                          backgroundColor: colors.bgElevated,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Bell size={20} color={colors.text} strokeWidth={2} />
                      {badgeCount > 0 ? (
                        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                          <Text style={styles.badgeText}>
                            {badgeCount > 9 ? '9+' : badgeCount}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  </>
                }
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open analytics for your Focus Score"
                onPress={openAnalytics}
                style={({ pressed }) => [styles.scoreHit, pressed && { opacity: 0.85 }]}
              >
                <SuccessScore
                  score={brief.successScore}
                  label={brief.successLabel}
                  insight={brief.successInsight}
                />
              </Pressable>
            </View>

            <Text style={[styles.sectionHeadline, { color: colors.text }]} accessibilityRole="header">
              Top Priorities Today
            </Text>

            {showSearch && !inboxOpen ? (
              <View style={styles.searchWrap}>
                <SearchBar
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search focus and briefing"
                />
              </View>
            ) : null}
          </View>

          <View style={[styles.section, { borderBottomColor: colors.borderSubtle }]}>
            <HomeSection showHeader={false}>
              {brief.focus.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No priorities yet"
                  description={
                    env.liveHomeBrief
                      ? 'Connect Google, Slack, GitHub, or Notion — then pull to refresh once sync lands.'
                      : 'Your focus list will show up here.'
                  }
                  actionLabel={env.liveHomeBrief ? 'Open Profile' : undefined}
                  onAction={env.liveHomeBrief ? () => workspaceNav.profile() : undefined}
                />
              ) : (
                <View style={styles.focusGroups}>
                  {brief.focus.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.focusRow,
                        index < brief.focus.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border,
                          paddingBottom: spacing[16],
                          marginBottom: spacing[16],
                        },
                      ]}
                    >
                      <Text
                        style={[styles.focusNumber, { color: colors.priority[item.priority] }]}
                        accessibilityLabel={`Priority ${index + 1}`}
                      >
                        {index + 1}
                      </Text>
                      <View style={styles.focusCard}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open details for ${item.title}`}
                          onPress={() => openFocus(item.id)}
                        >
                          <View style={styles.focusHeader}>
                            <PlatformLogo platform={item.platform} size={26} />
                            <View style={styles.focusCopy}>
                              <View style={styles.focusMeta}>
                                <Text
                                  style={[styles.focusApp, { color: colors.textSecondary }]}
                                  numberOfLines={1}
                                >
                                  {item.urgencyLabel}
                                </Text>
                                <View style={styles.focusMetaTrailing}>
                                  <PriorityBadge priority={item.priority} size="sm" />
                                  <Text
                                    style={[styles.focusTime, { color: colors.textTertiary }]}
                                    numberOfLines={1}
                                  >
                                    {item.estimatedTime}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.focusTitleRow}>
                                <Text
                                  style={[styles.focusTitle, { color: colors.text }]}
                                  numberOfLines={1}
                                >
                                  {item.title}
                                </Text>
                                <ChevronRight size={14} color={colors.textTertiary} strokeWidth={2} />
                              </View>
                            </View>
                          </View>
                        </Pressable>
                        <View style={styles.focusThread}>
                          <FocusRow
                            item={item}
                            onPress={() => openFocus(item.id)}
                            onActionPress={(action) => onFocusAction(item.id, action)}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </HomeSection>
          </View>

          <View>
            <HomeSection title="Today's brief">
              {briefingGroups.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Brief is quiet"
                  description={
                    env.liveHomeBrief
                      ? 'Priorities already cover the urgent work — or pull to refresh after sync for more context.'
                      : 'Briefing signals will show up here.'
                  }
                />
              ) : (
                <View style={styles.briefingGroups}>
                  {briefingGroups.map((group) => (
                    <View key={group.section}>
                      <View style={styles.groupHeader}>
                        <Text style={[styles.groupTitle, { color: colors.text }]}>
                          {group.section}
                        </Text>
                      </View>
                      <View style={[styles.thread, { borderLeftColor: colors.border }]}>
                        {group.items.map((signal) => (
                          <BriefingSignalRow key={signal.id} item={signal} />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </HomeSection>
          </View>
        </View>
      </ScrollView>

      <NotificationsInboxSheet
        visible={inboxOpen}
        workspaceId={workspaceId}
        onClose={() => setInboxOpen(false)}
        onUnreadChange={setUnreadCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingTop: spacing[12] },
  viewport: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  hero: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    paddingBottom: spacing[20],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[12],
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[16],
  },
  scoreHit: {
    flexShrink: 0,
  },
  sectionHeadline: {
    ...typography.title2,
    fontFamily: fontFamily.semibold,
    letterSpacing: -0.4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  searchWrap: {
    marginHorizontal: -spacing[4],
  },
  section: {
    paddingTop: spacing[16],
    paddingBottom: spacing[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  focusGroups: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  focusNumber: {
    width: 24,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 26,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  focusCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing[4],
    overflow: 'hidden',
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[12],
    paddingBottom: spacing[4],
  },
  focusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  focusMeta: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: spacing[8],
    minWidth: 0,
  },
  focusApp: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  focusMetaTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginLeft: 'auto',
    flexShrink: 0,
  },
  focusTime: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  focusTitleRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: spacing[4],
    minWidth: 0,
  },
  focusTitle: {
    ...typography.callout,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    letterSpacing: -0.2,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  focusThread: {
    paddingHorizontal: spacing[12],
  },
  briefingGroups: {
    paddingBottom: spacing[16],
    gap: spacing[24],
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingHorizontal: spacing[32],
    paddingBottom: spacing[12],
  },
  groupTitle: {
    ...typography.subhead,
    fontWeight: '600',
    flexShrink: 1,
  },
  thread: {
    marginLeft: spacing[32],
    marginRight: spacing[32],
    borderLeftWidth: 2,
    paddingLeft: spacing[20],
    gap: spacing[24],
  },
});
