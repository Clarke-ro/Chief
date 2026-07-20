import { StyleSheet, Text, View } from 'react-native';

import { GroupedCard, InsetSeparator } from '@/components/ui';
import { SETTING_ROW_LEFT_INSET, SettingRow } from '@/features/profile/components/SettingRow';
import type { SubscriptionInfo } from '@/features/profile/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

type SubscriptionBannerProps = {
  subscription: SubscriptionInfo;
  onManage: () => void;
  onUpgrade: () => void;
};

/** Plan summary + Manage / Upgrade rows — same card + row pattern as settings. */
export function SubscriptionBanner({ subscription, onManage, onUpgrade }: SubscriptionBannerProps) {
  const colors = useThemeColors();

  return (
    <GroupedCard>
      <View style={styles.top}>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>Current plan</Text>
          <Text style={[styles.plan, { color: colors.text }]} numberOfLines={2}>
            {subscription.plan}
          </Text>
          <Text style={[styles.renewal, { color: colors.textSecondary }]} numberOfLines={2}>
            Renews {subscription.renewalDate}
          </Text>
        </View>
        <View style={[styles.mark, { backgroundColor: colors.accentMuted }]}>
          <Text style={[styles.markText, { color: colors.accent }]}>PRO</Text>
        </View>
      </View>

      <InsetSeparator inset={SETTING_ROW_LEFT_INSET} />
      <SettingRow title="Manage" onPress={onManage} />
      <InsetSeparator inset={SETTING_ROW_LEFT_INSET} />
      <SettingRow title="Upgrade" onPress={onUpgrade} />
    </GroupedCard>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    gap: spacing[12],
  },
  copy: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: spacing[2],
  },
  label: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    lineHeight: 16,
  },
  plan: {
    ...typography.body,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 22,
  },
  renewal: {
    ...typography.footnote,
    lineHeight: 18,
  },
  mark: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.md,
    flexShrink: 0,
  },
  markText: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    letterSpacing: 0.6,
    lineHeight: 16,
  },
});
