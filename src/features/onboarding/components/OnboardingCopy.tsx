import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing, typography } from '@/theme';

type OnboardingCopyProps = {
  eyebrow?: string;
  title: string;
  body?: string;
};

/** Large, calm typography block — scales down slightly on narrow phones. */
export function OnboardingCopy({ eyebrow, title, body }: OnboardingCopyProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const titleSize = compact ? 30 : 34;
  const titleLine = compact ? 36 : 40;

  return (
    <View style={styles.wrap} accessibilityRole="header">
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>{eyebrow}</Text>
      ) : null}
      <Text
        style={[
          styles.title,
          { color: colors.text, fontSize: titleSize, lineHeight: titleLine },
        ]}
      >
        {title}
      </Text>
      {body ? <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[12],
    width: '100%',
    alignSelf: 'stretch',
  },
  eyebrow: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.display,
    letterSpacing: -0.7,
  },
  body: {
    ...typography.callout,
    lineHeight: 24,
    width: '100%',
  },
});
