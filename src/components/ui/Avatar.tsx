import { Image, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius } from '@/theme';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
};

const SIZES: Record<AvatarSize, number> = {
  sm: 28,
  md: 40,
  lg: 56,
  xl: 80,
};

function initialsFrom(name?: string): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const colors = useThemeColors();
  const dim = SIZES[size];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={name ? `Avatar for ${name}` : 'Avatar'}
        style={{
          width: dim,
          height: dim,
          borderRadius: radius.full,
          backgroundColor: colors.bgSubtle,
        }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={name ? `Avatar for ${name}` : 'Avatar'}
      style={[
        styles.fallback,
        {
          width: dim,
          height: dim,
          borderRadius: radius.full,
          backgroundColor: colors.accentMuted,
        },
      ]}
    >
      <Typography
        variant={size === 'xl' || size === 'lg' ? 'title3' : 'caption'}
        color="accent"
        style={{ fontWeight: '600' }}
      >
        {initialsFrom(name)}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
