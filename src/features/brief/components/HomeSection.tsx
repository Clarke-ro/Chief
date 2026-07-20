import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type HomeSectionProps = {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** When false, only children render (title lives elsewhere, e.g. Home hero) */
  showHeader?: boolean;
  children: ReactNode;
};

export function HomeSection({
  title,
  subtitle,
  actionLabel = 'View all',
  onAction,
  showHeader = true,
  children,
}: HomeSectionProps) {
  const colors = useThemeColors();

  return (
    <View>
      {showHeader && title ? (
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            ) : null}
          </View>
          {onAction ? (
            <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
              <Text style={[styles.action, { color: colors.textTertiary }]}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[24],
    paddingTop: spacing[24],
    paddingBottom: spacing[12],
  },
  heading: {
    flex: 1,
    gap: spacing[8],
  },
  title: {
    ...typography.title2,
    fontFamily: fontFamily.semibold,
    letterSpacing: -0.4,
  },
  subtitle: {
    ...typography.footnote,
  },
  action: {
    ...typography.footnote,
  },
});
