import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type ProfileSectionLabelProps = {
  title: string;
  description?: string;
};

/** Small uppercase label above a grouped card (WhatsApp section style). */
export function ProfileSectionLabel({ title, description }: ProfileSectionLabelProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textTertiary }]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing[4],
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  title: {
    ...typography.footnote,
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  description: {
    ...typography.footnote,
    lineHeight: 18,
    textTransform: 'none',
    letterSpacing: 0,
  },
});
