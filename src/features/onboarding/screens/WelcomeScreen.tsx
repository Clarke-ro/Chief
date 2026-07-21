import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ChiefLogo } from '@/features/chief/components/ChiefLogo';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing, typography } from '@/theme';

/** Brand-first welcome — logo + one CTA into auth. */
export function WelcomeScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();
  const router = useRouter();
  const goAuth = () => router.push('/onboarding/auth');

  const isLight = scheme === 'light';
  const titleColor = isLight ? '#111113' : colors.text;
  const iconBg = isLight ? '#111113' : colors.text;
  const iconFg = isLight ? '#FFFFFF' : colors.bg;

  return (
    <OnboardingShell stepIndex={0} showBack={false} centered={false}>
      <View style={styles.screen}>
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <ChiefLogo size={44} />
            <Text
              style={[styles.brand, { color: colors.text }]}
              accessibilityRole="header"
            >
              Chief
            </Text>
          </View>
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
            accessibilityLabel="I already have an account"
            activeOpacity={0.55}
            onPress={goAuth}
            style={styles.secondary}
          >
            <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
              I already have an account
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  brand: {
    ...typography.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.2,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    gap: spacing[12],
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
    fontWeight: '500',
    textAlign: 'center',
  },
});
