import type { LucideIcon } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/theme';

type AppHeaderAction = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  /** Up to a few trailing icon actions */
  actions?: AppHeaderAction[];
  trailing?: ReactNode;
};

/** Screen-level header: title, optional subtitle, and trailing actions. */
export function AppHeader({ title, subtitle, leading, actions, trailing }: AppHeaderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={styles.row}
      accessibilityRole="header"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.copy}>
        <Typography variant="title1" numberOfLines={1}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="callout" color="secondary" numberOfLines={2}>
            {subtitle}
          </Typography>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {actions?.map((action) => {
          const Icon = action.icon;
          return (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              hitSlop={8}
              onPress={action.onPress}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Icon size={22} color={colors.text} strokeWidth={2} />
            </Pressable>
          );
        })}
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
    paddingHorizontal: spacing[20],
    paddingTop: spacing[8],
    paddingBottom: spacing[16],
  },
  leading: {
    paddingTop: spacing[4],
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
    paddingTop: spacing[4],
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.72 },
});
