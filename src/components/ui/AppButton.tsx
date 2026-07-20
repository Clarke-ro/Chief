import { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

import { Button } from '@/components/ui/Button';

type AppButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/** Primary action control — themed wrapper around the shared Button primitive. */
export function AppButton({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
  accessibilityLabel,
}: AppButtonProps) {
  return (
    <Button
      onPress={onPress}
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      style={style}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Button>
  );
}
