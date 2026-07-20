import { ChevronRight } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

/** Standard horizontal inset for left-aligned labels inside a grouped card */
const LEFT_TEXT_INSET = spacing[16];

type SettingRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  value?: string;
  trailing?: ReactNode;
  showChevron?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (next: boolean) => void;
  onPress?: () => void;
  /** @deprecated Separators are owned by SettingsGroup */
  isLast?: boolean;
  destructive?: boolean;
};

/** Compact row inside a grouped settings card. */
export function SettingRow({
  title,
  subtitle,
  leading,
  value,
  trailing,
  showChevron = true,
  switchValue,
  onSwitchChange,
  onPress,
  destructive = false,
}: SettingRowProps) {
  const colors = useThemeColors();
  const isSwitch = switchValue != null && onSwitchChange != null;
  const interactive = Boolean(onPress) && !isSwitch;
  const showChevronIcon = !isSwitch && showChevron && Boolean(onPress);

  return (
    <Pressable
      accessibilityRole={isSwitch ? undefined : onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${title}, ${value}` : title}
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      style={({ pressed }) => [
        interactive && pressed ? { backgroundColor: colors.bgSubtle } : null,
      ]}
    >
      <View
        style={[
          styles.row,
          destructive ? styles.rowDestructive : styles.rowLeftAligned,
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}

        <View style={[styles.copy, destructive && styles.copyCentered]}>
          <Text
            style={[
              styles.title,
              {
                color: destructive ? colors.danger : colors.text,
                textAlign: destructive ? 'center' : 'left',
                fontFamily: destructive ? fontFamily.medium : fontFamily.regular,
              },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>

        {!destructive ? (
          <View style={styles.trailing}>
            {value ? (
              <Text style={[styles.value, { color: colors.textTertiary }]} numberOfLines={1}>
                {value}
              </Text>
            ) : null}

            {trailing}

            {isSwitch ? (
              <Switch
                value={switchValue}
                onValueChange={onSwitchChange}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.bgElevated}
                ios_backgroundColor={colors.border}
                accessibilityLabel={title}
                style={styles.switch}
              />
            ) : null}

            {showChevronIcon ? (
              <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    width: '100%',
    gap: spacing[8],
    paddingRight: spacing[16],
    paddingVertical: spacing[12],
    minHeight: 44,
  },
  rowLeftAligned: {
    paddingLeft: LEFT_TEXT_INSET,
  },
  rowDestructive: {
    paddingLeft: spacing[16],
    justifyContent: 'center',
    alignItems: 'center',
  },
  leading: {
    width: 28,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: spacing[2],
    justifyContent: 'center',
  },
  copyCentered: {
    flexGrow: 1,
    alignItems: 'center',
  },
  title: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 21,
  },
  subtitle: {
    ...typography.footnote,
    lineHeight: 16,
  },
  trailing: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    gap: spacing[8],
    marginLeft: 'auto',
  },
  value: {
    ...typography.callout,
    fontFamily: fontFamily.regular,
    maxWidth: 120,
    textAlign: 'right',
    flexShrink: 0,
  },
  switch: {
    flexShrink: 0,
  },
});

export const SETTING_ROW_LEFT_INSET = LEFT_TEXT_INSET;
