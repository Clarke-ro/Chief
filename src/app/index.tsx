import { Redirect } from 'expo-router';

import { usePreferencesStore } from '@/stores';

/**
 * App entry — send returning users to Home; first launch through onboarding.
 */
export default function Index() {
  const onboardingCompleted = usePreferencesStore((s) => s.onboardingCompleted);
  return <Redirect href={onboardingCompleted ? '/home' : '/onboarding'} />;
}
