import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { usePreferencesStore } from '@/stores';

/** Legacy route — enter Home from the first brief instead. */
export default function ReadyRedirect() {
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);

  useEffect(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  return <Redirect href="/home" />;
}
