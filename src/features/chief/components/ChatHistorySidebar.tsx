import { useCallback, useMemo, useState } from 'react';
import { Search } from 'lucide-react-native';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupedCard } from '@/components/ui';
import type { ChatSession } from '@/features/chief/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { chatTypography, fontFamily, radius, spacing } from '@/theme';

type ChatHistorySidebarProps = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNewChat?: () => void;
  /** Stretch to fill when embedded in a persistent column */
  fill?: boolean;
};

/** History panel — search and subtle chat cards. */
export function ChatHistorySidebar({
  sessions,
  activeSessionId,
  onSelect,
  fill = true,
}: ChatHistorySidebarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [query, sessions]);

  const renderItem = useCallback(
    ({ item: session }: { item: ChatSession }) => {
      const selected = session.id === activeSessionId;
      return (
        <GroupedCard
          style={{
            backgroundColor: selected ? colors.accentMuted : 'transparent',
          }}
          contentStyle={styles.card}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={session.title}
            onPress={() => onSelect(session.id)}
            style={({ pressed }) => [
              pressed && !selected && { backgroundColor: colors.bgSubtle },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text
              style={[
                styles.chatTitle,
                {
                  color: selected ? colors.accent : colors.text,
                  fontFamily: selected ? fontFamily.semibold : fontFamily.regular,
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {session.title}
            </Text>
          </Pressable>
        </GroupedCard>
      );
    },
    [activeSessionId, colors.accent, colors.accentMuted, colors.bgSubtle, colors.text, onSelect],
  );

  return (
    <View
      style={[
        styles.wrap,
        fill && styles.fill,
        {
          backgroundColor: colors.bg,
          paddingBottom: Math.max(insets.bottom, spacing[12]),
        },
      ]}
    >
      <View style={styles.topBar}>
        <View style={[styles.search, { backgroundColor: colors.bgElevated }]}>
          <Search size={18} color={colors.textTertiary} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            accessibilityLabel="Search chats"
            returnKeyType="search"
          />
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Chats</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
            {query.trim() ? 'No matching chats' : 'No chats yet'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
  },
  fill: {
    height: '100%',
  },
  topBar: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[8],
    paddingBottom: spacing[16],
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    minHeight: 44,
    paddingHorizontal: spacing[12],
    borderRadius: radius.lg,
  },
  searchInput: {
    ...chatTypography.body,
    fontFamily: fontFamily.regular,
    flex: 1,
    paddingVertical: spacing[8],
  },
  sectionLabel: {
    ...chatTypography.caption,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[20],
    marginBottom: spacing[8],
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[12],
    paddingBottom: spacing[16],
    gap: spacing[4],
  },
  empty: {
    ...chatTypography.footnote,
    paddingVertical: spacing[16],
  },
  card: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  chatTitle: {
    ...chatTypography.body,
    fontSize: 16,
    lineHeight: 22,
  },
});
