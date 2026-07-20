import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { getActiveWorkspaceId } from '@/services/activeWorkspace';
import { queryClient, queryKeys } from '@/services';

/**
 * Deep-link landing for integration OAuth callbacks (`chief://integrations/callback`).
 * WebBrowser auth sessions usually resolve before navigation; this route covers cold starts.
 */
export default function IntegrationsCallbackScreen() {
  const params = useLocalSearchParams<{ status?: string }>();

  useEffect(() => {
    const workspaceId = getActiveWorkspaceId();
    void queryClient.invalidateQueries({ queryKey: queryKeys.integrations(workspaceId) });
  }, []);

  if (params.status === 'error') {
    return <Redirect href="/onboarding/connect" />;
  }

  return <Redirect href="/onboarding/connect" />;
}
