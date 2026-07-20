import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type GreetingProps = {
  userName: string;
  dateLabel: string;
  brand?: string;
  /** Icons aligned with the brand / date row (search, notifications, etc.) */
  actions?: ReactNode;
};

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Home header — brand, date, and welcome (date-sized). */
export function Greeting({ userName, dateLabel, brand = 'Chief', actions }: GreetingProps) {
  const colors = useThemeColors();
  const greeting = greetingForHour(new Date().getHours());

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.brandBlock}>
          <Text style={[styles.brand, { color: colors.accent }]} numberOfLines={1}>
            {brand}
          </Text>
          <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
            {dateLabel}
          </Text>
          <Text
            style={[styles.meta, { color: colors.textTertiary }]}
            numberOfLines={1}
            accessibilityRole="text"
          >
            {greeting}, {userName}
          </Text>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing[12],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  brandBlock: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
  },
  brand: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  meta: {
    ...typography.footnote,
    fontFamily: fontFamily.medium,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing[4],
  },
});
