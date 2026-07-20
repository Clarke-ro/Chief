import type { LucideIcon } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/theme';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.wrap}>
      {Icon ? <Icon size={36} color={colors.textTertiary} strokeWidth={1.75} /> : null}
      <Typography variant="title2" align="center">
        {title}
      </Typography>
      <Typography variant="body" color="secondary" align="center" style={styles.description}>
        {description}
      </Typography>
      {action}
      {!action && actionLabel && onAction ? (
        <Button variant="secondary" onPress={onAction} style={styles.cta}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    paddingVertical: spacing[64],
    gap: spacing[12],
  },
  description: {
    maxWidth: 300,
  },
  cta: {
    marginTop: spacing[8],
    minWidth: 160,
  },
});
