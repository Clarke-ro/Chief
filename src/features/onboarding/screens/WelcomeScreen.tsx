import { useRouter } from 'expo-router';
import { ArrowRight, Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ChiefLogo } from '@/features/chief/components/ChiefLogo';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useThemeColors } from '@/hooks/useThemeColors';
import { notifyAlert } from '@/services/confirm';
import { radius, spacing, typography } from '@/theme';

/** Brand-first welcome — CTAs first, legal agreement tucked under account link. */
export function WelcomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  const goAuth = () => {
    if (!agreed) {
      notifyAlert(
        'Agreement required',
        'Please confirm you agree to the Terms of Service and Privacy Policy to continue.',
      );
      return;
    }
    router.push('/onboarding/auth');
  };

  return (
    <OnboardingShell stepIndex={0} showBack={false} centered={false}>
      <View style={styles.screen}>
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <ChiefLogo size={48} />
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
            style={[styles.primary, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.primaryLabel}>Get started</Text>
            <View style={styles.primaryIcon}>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.25} />
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

          <View style={styles.agreeRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="Agree to Terms of Service and Privacy Policy"
              onPress={() => setAgreed((v) => !v)}
              hitSlop={8}
              style={[
                styles.checkbox,
                {
                  borderColor: agreed ? colors.accent : colors.border,
                  backgroundColor: agreed ? colors.accent : 'transparent',
                },
              ]}
            >
              {agreed ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
            </Pressable>
            <Text style={[styles.agreeText, { color: colors.textTertiary }]}>
              By continuing, you agree to the{' '}
              <Text
                accessibilityRole="link"
                onPress={() => router.push('/legal/terms')}
                style={[styles.agreeLink, { color: colors.textSecondary }]}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                accessibilityRole="link"
                onPress={() => router.push('/legal/privacy')}
                style={[styles.agreeLink, { color: colors.textSecondary }]}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
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
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.2,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    gap: spacing[8],
    paddingTop: spacing[24],
    flexShrink: 0,
  },
  primary: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[16],
    borderRadius: radius.xl,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryIcon: {
    position: 'absolute',
    right: spacing[16],
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
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
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[10],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  agreeLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
