import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ChiefLogo } from '@/features/chief/components/ChiefLogo';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type GreetingProps = {
  userName: string;
  dateLabel: string;
  /** e.g. "Synced 12m ago" — shown under the greeting line. */
  freshnessLabel?: string | null;
  brand?: string;
  /** Icons aligned with the brand / date row (search, notifications, etc.) */
  actions?: ReactNode;
};

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Home header — logo, date, and personalized welcome. */
export function Greeting({
  userName,
  dateLabel,
  freshnessLabel,
  brand = 'Chief',
  actions,
}: GreetingProps) {
  const colors = useThemeColors();
  const greeting = greetingForHour(new Date().getHours());
  const displayName = userName.trim() || 'there';

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.brandBlock}>
          <View style={styles.brandRow}>
            <ChiefLogo size={18} />
            <Text style={[styles.brand, { color: colors.accent }]} numberOfLines={1}>
              {brand}
            </Text>
          </View>
          <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
            {dateLabel}
          </Text>
          <Text
            style={[styles.greeting, { color: colors.text }]}
            numberOfLines={1}
            accessibilityRole="text"
          >
            {greeting}, {displayName}
          </Text>
          {freshnessLabel ? (
            <Text
              style={[styles.freshness, { color: colors.textSecondary }]}
              numberOfLines={1}
              accessibilityLabel={`Data freshness: ${freshnessLabel}`}
            >
              {freshnessLabel}
            </Text>
          ) : null}
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  greeting: {
    ...typography.subhead,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
  },
  freshness: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing[4],
  },
});
