import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ChiefLogo } from '@/features/chief/components/ChiefLogo';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { authService, AuthServiceError } from '@/services/auth/authService';
import { usePreferencesStore, useSessionBootStore, useWorkspaceStore } from '@/stores';
import { radius, spacing, typography } from '@/theme';

type AuthMode = 'signIn' | 'signUp';

/** Email/password sign-in or sign-up against the live backend. */
export function AuthScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const continueAfterAuth = (me: Awaited<ReturnType<typeof authService.signIn>>) => {
    useWorkspaceStore.getState().applyUserIdentity({
      name: me.user.name,
      email: me.user.email,
      image: me.user.image,
    });

    if (me.user.onboardingCompleted) {
      usePreferencesStore.getState().completeOnboarding();
      router.replace('/home');
      return;
    }
    usePreferencesStore.getState().resetOnboarding();
    router.replace('/onboarding/connect');
  };

  const isLight = scheme === 'light';
  const labelColor = isLight ? '#111113' : colors.text;
  const placeholderColor = colors.textTertiary;
  const canSubmit = email.trim().length > 0 && password.length >= 8 && !submitting;

  const showError = (title: string, message: string) => {
    setErrorMessage(message);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      showError(
        mode === 'signIn' ? 'Sign in' : 'Sign up',
        'Enter your email and a password with at least 8 characters.',
      );
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      const me =
        mode === 'signIn'
          ? await authService.signIn(email, password)
          : await authService.signUp({ email, password });
      useSessionBootStore.getState().markSignedIn(me);
      continueAfterAuth(me);
    } catch (error) {
      const message =
        error instanceof AuthServiceError
          ? error.message
          : error instanceof Error && error.message.trim()
            ? error.message
            : 'Could not reach Chief. Check your connection and try again.';
      showError(mode === 'signIn' ? 'Sign in failed' : 'Sign up failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
    setErrorMessage(null);
  };

  return (
    <OnboardingShell stepIndex={1} centered={false} showSkip={false}>
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
          <View style={styles.header}>
            <ChiefLogo size={36} />
            <OnboardingCopy
              title={mode === 'signIn' ? 'Welcome back.' : 'Create your account.'}
              body={
                mode === 'signIn'
                  ? 'Sign in to pick up where Chief left off.'
                  : 'Hire Chief to prioritize your day from the apps you already use.'
              }
            />
          </View>

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
              editable={!submitting}
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
              placeholder="Password (8+ characters)"
              placeholderTextColor={placeholderColor}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={mode === 'signIn' ? 'password' : 'new-password'}
              textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
              accessibilityLabel="Password"
              editable={!submitting}
              style={[
                styles.input,
                {
                  color: labelColor,
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.border,
                },
              ]}
            />

            {errorMessage ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={mode === 'signIn' ? 'Sign in' : 'Sign up'}
              accessibilityState={{ disabled: !canSubmit }}
              activeOpacity={0.85}
              disabled={!canSubmit}
              onPress={() => void handleSubmit()}
              style={[
                styles.signInBtn,
                {
                  backgroundColor: labelColor,
                  opacity: canSubmit ? 1 : 0.5,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={isLight ? '#FFFFFF' : colors.bg} />
              ) : (
                <Text style={[styles.signInLabel, { color: isLight ? '#FFFFFF' : colors.bg }]}>
                  {mode === 'signIn' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={mode === 'signIn' ? 'Switch to sign up' : 'Switch to sign in'}
              activeOpacity={0.6}
              disabled={submitting}
              onPress={toggleMode}
              style={styles.signUpRow}
            >
              <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
                {mode === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={[styles.signUpLink, { color: labelColor }]}>
                  {mode === 'signIn' ? 'Sign up' : 'Sign in'}
                </Text>
              </Text>
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
    justifyContent: 'center',
    gap: spacing[32],
    paddingBottom: spacing[16],
  },
  header: {
    width: '100%',
    gap: spacing[20],
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
  errorText: {
    ...typography.subhead,
    fontWeight: '500',
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
});
