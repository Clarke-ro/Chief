import { PanelLeft, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

type ChiefHeaderProps = {
  showHistoryToggle?: boolean;
  onToggleHistory?: () => void;
  onNewChat?: () => void;
  /** Active chat title when reviewing a past session */
  sessionTitle?: string | null;
};

/** Chief header — history / centered title / new chat. */
export function ChiefHeader({
  showHistoryToggle,
  onToggleHistory,
  onNewChat,
  sessionTitle,
}: ChiefHeaderProps) {
  const colors = useThemeColors();
  const title = sessionTitle?.trim() || 'Chief';

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.borderSubtle }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {showHistoryToggle ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open chat history"
              onPress={onToggleHistory}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: pressed ? colors.bgSubtle : colors.bgElevated },
              ]}
            >
              <PanelLeft size={20} color={colors.text} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>

        <View style={[styles.side, styles.sideEnd]}>
          {onNewChat ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New chat"
              onPress={onNewChat}
              style={({ pressed }) => [
                styles.newBtn,
                {
                  backgroundColor: colors.accentMuted,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Plus size={18} color={colors.accent} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[4],
    paddingBottom: spacing[12],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  side: {
    width: 44,
    flexShrink: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  title: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: spacing[8],
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
