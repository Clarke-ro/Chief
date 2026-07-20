import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing, typography } from '@/theme';

/** Step 2 — email/password sign-in, then social options. */
export function AuthScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const continueNext = () => router.push('/onboarding/connect');
  const isLight = scheme === 'light';
  const labelColor = isLight ? '#111113' : colors.text;
  const placeholderColor = colors.textTertiary;

  return (
    <OnboardingShell stepIndex={1} centered={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <OnboardingCopy title="Sign in to hire Chief." />

          <View style={styles.form}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              accessibilityLabel="Email"
              style={[
                styles.input,
                {
                  color: labelColor,
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                },
              ]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={placeholderColor}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              accessibilityLabel="Password"
              style={[
                styles.input,
                {
                  color: labelColor,
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                },
              ]}
            />

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              activeOpacity={0.85}
              onPress={continueNext}
              style={[styles.signInBtn, { backgroundColor: labelColor }]}
            >
              <Text style={[styles.signInLabel, { color: isLight ? '#FFFFFF' : colors.bg }]}>
                Sign in
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sign up"
              activeOpacity={0.6}
              onPress={continueNext}
              style={styles.signUpRow}
            >
              <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
                {"Don't have an account? "}
                <Text style={[styles.signUpLink, { color: labelColor }]}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.social}>
            <Text style={[styles.loginWith, { color: colors.textTertiary }]}>Log in with</Text>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
              activeOpacity={0.85}
              onPress={continueNext}
              style={[
                styles.socialBtn,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.socialLabel, { color: labelColor }]}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              activeOpacity={0.85}
              onPress={continueNext}
              style={[
                styles.socialBtn,
                {
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.socialLabel, { color: labelColor }]}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing[24],
    paddingBottom: spacing[16],
  },
  form: {
    width: '100%',
    gap: spacing[12],
  },
  input: {
    width: '100%',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    fontSize: 16,
    lineHeight: 22,
  },
  signInBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  signInLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  signUpRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  signUpText: {
    ...typography.subhead,
    textAlign: 'center',
  },
  signUpLink: {
    fontWeight: '600',
  },
  social: {
    width: '100%',
    gap: spacing[12],
    paddingTop: spacing[32],
  },
  loginWith: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  socialBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
  },
  socialLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
});
