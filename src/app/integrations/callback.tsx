import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { getActiveWorkspaceId } from '@/services/activeWorkspace';
import { queryClient, queryKeys } from '@/services';

function safeNextPath(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('://')
  ) {
    return value;
  }
  return '/onboarding/connect';
}

/**
 * Landing for integration OAuth callbacks.
 * Native: `chief://integrations/callback`. Web: `https://…/integrations/callback`.
 */
export default function IntegrationsCallbackScreen() {
  const params = useLocalSearchParams<{ status?: string; next?: string }>();
  const href = safeNextPath(params.next);

  useEffect(() => {
    const workspaceId = getActiveWorkspaceId();
    void queryClient.invalidateQueries({ queryKey: queryKeys.integrations(workspaceId) });
  }, []);

  return <Redirect href={href} />;
}
