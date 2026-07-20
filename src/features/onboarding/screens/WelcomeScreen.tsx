import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing, typography } from '@/theme';

/** Step 1 — brand-first welcome, then hire Chief. */
export function WelcomeScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const brandSize = width < 360 ? 42 : 48;
  const goAuth = () => router.push('/onboarding/auth');

  const isLight = scheme === 'light';
  const titleColor = isLight ? '#111113' : colors.text;
  const iconBg = isLight ? '#111113' : colors.text;
  const iconFg = isLight ? '#FFFFFF' : colors.bg;

  return (
    <OnboardingShell stepIndex={0} showBack={false} centered={false}>
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Text
            style={[
              styles.brand,
              { color: colors.text, fontSize: brandSize, lineHeight: brandSize + 4 },
            ]}
            accessibilityRole="header"
          >
            Chief
          </Text>
          <OnboardingCopy
            title="Your AI that understands your work."
            body="Analyze. Prioritize. Schedule. Execute."
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Get started"
            activeOpacity={0.85}
            onPress={goAuth}
            style={[
              styles.card,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: titleColor }]}>Get started</Text>
            <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
              <ArrowRight size={18} color={iconFg} strokeWidth={2.25} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="I already have a Chief"
            activeOpacity={0.55}
            onPress={goAuth}
            style={styles.secondary}
          >
            <Text style={[styles.secondaryLabel, { color: titleColor }]}>
              I already have a Chief
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  hero: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing[32],
    width: '100%',
  },
  brand: {
    ...typography.display,
    letterSpacing: -1.2,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    gap: spacing[16],
    paddingTop: spacing[24],
    flexShrink: 0,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[16],
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardIcon: {
    position: 'absolute',
    right: spacing[16],
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: spacing[8],
  },
  secondaryLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
