import { Pencil } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import type { ProfileUser } from '@/features/profile/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

type ProfileIdentityProps = {
  user: ProfileUser;
  onEdit?: () => void;
};

/** Account header — avatar + identity in a single horizontal composition. */
export function ProfileIdentity({ user, onEdit }: ProfileIdentityProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.bgElevated,
        },
      ]}
      accessibilityLabel={`${user.name}, ${user.email}, ${user.plan} plan`}
    >
      <Avatar uri={user.avatarUri} name={user.name} size="xl" />

      <View style={styles.copy}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
          {user.email}
        </Text>
        <Text style={[styles.plan, { color: colors.accent }]}>{user.plan} Plan</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit Profile"
        onPress={onEdit}
        hitSlop={8}
        style={({ pressed }) => [
          styles.edit,
          {
            backgroundColor: colors.bgSubtle,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Pencil size={16} color={colors.text} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
    marginHorizontal: spacing[16],
    padding: spacing[16],
    borderRadius: radius.lg,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
  },
  name: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
    letterSpacing: -0.3,
  },
  email: {
    ...typography.footnote,
  },
  plan: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    marginTop: spacing[2],
  },
  edit: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
