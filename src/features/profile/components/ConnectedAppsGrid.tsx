import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupedCard, PlatformIcon } from '@/components/ui';
import type { ConnectedApp } from '@/features/profile/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

type ConnectedAppsGridProps = {
  apps: ConnectedApp[];
  onAppPress: (app: ConnectedApp) => void;
  onConnectMore: () => void;
};

/** Integrations map in a flexible grouped card (same sizing as Analytics cards). */
export function ConnectedAppsGrid({ apps, onAppPress, onConnectMore }: ConnectedAppsGridProps) {
  const colors = useThemeColors();

  return (
    <GroupedCard contentStyle={styles.card}>
      <View style={styles.grid}>
        {apps.map((app) => (
          <Pressable
            key={app.id}
            accessibilityRole="button"
            accessibilityLabel={`${app.name}, ${app.connected ? 'connected' : 'not connected'}`}
            onPress={() => onAppPress(app)}
            style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.iconWrap}>
              <PlatformIcon platform={app.platform} size={40} />
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: app.connected ? colors.success : colors.textTertiary,
                    borderColor: colors.bgElevated,
                  },
                ]}
              />
            </View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {app.name.replace('Google ', '')}
            </Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Connect More Apps"
          onPress={onConnectMore}
          style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View
            style={[
              styles.add,
              {
                backgroundColor: colors.bgSubtle,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Plus size={22} color={colors.accent} strokeWidth={2} />
          </View>
          <Text style={[styles.name, { color: colors.accent }]}>Add</Text>
        </Pressable>
      </View>

      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        Green means connected. Chief only reads what you allow.
      </Text>
    </GroupedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    gap: spacing[16],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  cell: {
    width: '25%',
    alignItems: 'center',
    gap: spacing[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
  },
  iconWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  dot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  add: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    width: '100%',
    lineHeight: 16,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing[8],
    lineHeight: 18,
  },
});
