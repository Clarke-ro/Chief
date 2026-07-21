import { Bell, ShieldAlert, Timer } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  notificationsRepository,
  type InboxNotification,
} from '@/services/repositories/notificationsRepository';
import { workspaceNav } from '@/services/workspaceNav';
import { fontFamily, radius, spacing, typography } from '@/theme';

type NotificationsInboxSheetProps = {
  visible: boolean;
  workspaceId?: string;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
};

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function typeIcon(type: string) {
  if (type === 'security') return ShieldAlert;
  if (type === 'deadline') return Timer;
  return Bell;
}

/** Slide-up inbox for deadline / security alerts from the Home bell. */
export function NotificationsInboxSheet({
  visible,
  workspaceId,
  onClose,
  onUnreadChange,
}: NotificationsInboxSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationsRepository.list({ workspaceId });
      setItems(result.items);
      setUnreadCount(result.unreadCount);
      onUnreadChange?.(result.unreadCount);
    } catch {
      setItems([]);
      setUnreadCount(0);
      onUnreadChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange, workspaceId]);

  useEffect(() => {
    if (visible) void load();
  }, [load, visible]);

  const openItem = async (item: InboxNotification) => {
    try {
      if (!item.readAt) {
        await notificationsRepository.markRead(item.id, workspaceId);
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row,
          ),
        );
        const nextUnread = Math.max(0, unreadCount - 1);
        setUnreadCount(nextUnread);
        onUnreadChange?.(nextUnread);
      }
    } catch {
      // Still navigate if mark-read fails.
    }

    onClose();
    if (item.href?.startsWith('/focus/')) {
      const id = item.href.slice('/focus/'.length);
      if (id) workspaceNav.focus(id);
      return;
    }
    workspaceNav.home();
  };

  const markAll = async () => {
    try {
      await notificationsRepository.markAllRead(workspaceId);
      setItems((prev) =>
        prev.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
      onUnreadChange?.(0);
    } catch {
      // keep prior state
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgElevated,
              paddingBottom: Math.max(insets.bottom, spacing[16]),
            },
          ]}
        >
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Alerts</Text>
          {unreadCount > 0 ? (
            <Pressable onPress={() => void markAll()} hitSlop={8}>
              <Text style={[styles.markAll, { color: colors.accent }]}>Mark all read</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.markAll, { color: colors.textSecondary }]}>Close</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No alerts yet"
            description="Deadlines and security signals will show up here after sync."
          />
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => {
              const Icon = typeIcon(item.type);
              const unread = !item.readAt;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => void openItem(item)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: unread ? colors.accentMuted : 'transparent',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor:
                          item.type === 'security' ? `${colors.danger}22` : colors.bg,
                      },
                    ]}
                  >
                    <Icon
                      size={18}
                      color={item.type === 'security' ? colors.danger : colors.accent}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={styles.copy}>
                    <Text
                      style={[
                        styles.rowTitle,
                        {
                          color: colors.text,
                          fontFamily: unread ? fontFamily.semibold : fontFamily.medium,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {item.body ? (
                      <Text
                        style={[styles.rowBody, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.body}
                      </Text>
                    ) : null}
                    <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
                      {item.type}
                      {' · '}
                      {formatAge(item.createdAt)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[16],
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[8],
  },
  title: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
  },
  markAll: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
  },
  loading: {
    paddingVertical: spacing[40],
    alignItems: 'center',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: spacing[16],
    gap: spacing[8],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[12],
    borderRadius: radius.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    ...typography.callout,
  },
  rowBody: {
    ...typography.caption,
  },
  rowMeta: {
    ...typography.caption,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
