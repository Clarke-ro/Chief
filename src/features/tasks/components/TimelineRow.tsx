import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlatformIcon, platformIconLabels } from '@/components/ui';
import type { DayPlanItem } from '@/features/tasks/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

const DOT_COL = 20;
const DOT_SIZE = 14;
const LINE_WIDTH = 2;
const ICON_SIZE = 32;

type TimelineRowProps = {
  item: DayPlanItem;
  isFirst?: boolean;
  isLast?: boolean;
  emphasize?: boolean;
  onPress?: () => void;
};

function dotColor(
  status: DayPlanItem['status'],
  emphasize: boolean,
  colors: ReturnType<typeof useThemeColors>,
): string {
  if (status === 'completed') return colors.success;
  if (status === 'in_progress' || emphasize) return colors.warning;
  return colors.textTertiary;
}

/**
 * Single horizontal line: time → dot → icon → (app above title).
 * Completed / swept-clear items render crossed out.
 */
export const TimelineRow = memo(function TimelineRow({
  item,
  isFirst = false,
  isLast = false,
  emphasize = false,
  onPress,
}: TimelineRowProps) {
  const colors = useThemeColors();
  const source = item.subtitle?.trim() || platformIconLabels[item.platform] || item.platform;
  const rail = dotColor(item.status, emphasize, colors);
  const crossed = item.status === 'completed' || item.sweepPhase === 'cleared';
  const stillOpen = item.sweepPhase === 'still_open' && item.status !== 'completed';
  const checking = item.sweepPhase === 'checking';
  const muted = crossed ? colors.textTertiary : colors.text;
  const sourceColor = crossed ? colors.textTertiary : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.time}. ${item.title}. ${source}${crossed ? '. Done' : ''}${stillOpen ? '. Still open' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View style={[styles.row, crossed && styles.rowCrossed]}>
        <Text
          style={[
            styles.time,
            { color: sourceColor },
            crossed && styles.strike,
          ]}
          numberOfLines={1}
        >
          {item.time}
        </Text>

        <View style={styles.dotCol}>
          <View
            pointerEvents="none"
            style={[
              styles.spine,
              {
                backgroundColor: colors.border,
                top: isFirst ? '50%' : -spacing[20],
                bottom: isLast ? '50%' : -spacing[20],
              },
            ]}
          />
          <View style={[styles.dot, { backgroundColor: rail }]} />
        </View>

        <View style={[styles.iconSlot, crossed && styles.iconMuted]}>
          <PlatformIcon platform={item.platform} size={ICON_SIZE} />
        </View>

        <View style={styles.copy}>
          <View style={styles.sourceRow}>
            <Text style={[styles.source, { color: sourceColor }, crossed && styles.strike]} numberOfLines={1}>
              {source}
            </Text>
            {item.blockKind === 'major' && !crossed ? (
              <Text style={[styles.badge, { color: colors.accent }]}>Focus</Text>
            ) : null}
            {stillOpen ? (
              <Text style={[styles.badge, { color: colors.warning }]}>Open</Text>
            ) : null}
            {checking ? (
              <Text style={[styles.badge, { color: colors.textSecondary }]}>Checking</Text>
            ) : null}
          </View>
          <Text
            style={[styles.title, { color: muted }, crossed && styles.strike]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  pressed: { opacity: 0.85 },

  row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[20],
  },
  rowCrossed: {
    opacity: 0.72,
  },

  time: {
    ...typography.subhead,
    minWidth: 72,
    maxWidth: 108,
    marginRight: spacing[8],
    fontFamily: fontFamily.medium,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },

  dotCol: {
    width: DOT_COL,
    height: ICON_SIZE,
    marginRight: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  spine: {
    position: 'absolute',
    width: LINE_WIDTH,
    left: (DOT_COL - LINE_WIDTH) / 2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    zIndex: 1,
  },

  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    marginRight: spacing[8],
    flexShrink: 0,
  },
  iconMuted: {
    opacity: 0.55,
  },

  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    minWidth: 0,
  },
  source: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontFamily.medium,
    fontWeight: '500',
    flexShrink: 1,
  },
  badge: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    flexShrink: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: {
    ...typography.callout,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
});
