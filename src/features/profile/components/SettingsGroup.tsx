import { Children, Fragment, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GroupedCard, InsetSeparator } from '@/components/ui';
import { SETTING_ROW_LEFT_INSET } from '@/features/profile/components/SettingRow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type SettingsGroupProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: string;
};

/**
 * Settings section — one flexible grouped card with inset separators between rows.
 */
export function SettingsGroup({ title, description, children, footer }: SettingsGroupProps) {
  const colors = useThemeColors();
  const items = Children.toArray(children);
  const caption = footer ?? description;

  return (
    <View style={styles.wrap}>
      {title ? (
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      ) : null}

      <GroupedCard>
        {items.map((child, index) => (
          <Fragment key={index}>
            {child}
            {index < items.length - 1 ? (
              <InsetSeparator inset={SETTING_ROW_LEFT_INSET} />
            ) : null}
          </Fragment>
        ))}
      </GroupedCard>

      {caption ? (
        <Text style={[styles.caption, { color: colors.textTertiary }]}>{caption}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[16],
    gap: spacing[4],
  },
  title: {
    ...typography.footnote,
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing[4],
  },
  caption: {
    ...typography.footnote,
    lineHeight: 16,
    paddingHorizontal: spacing[4],
  },
});
