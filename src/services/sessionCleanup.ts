import { authService } from '@/services/auth/authService';
import { queryClient } from '@/services/queryClient';
import { getActiveWorkspaceId } from '@/services/activeWorkspace';
import { offlineQueue } from '@/services/sync/offlineQueue';
import { GLOBAL_KEYS, LEGACY_KEYS, workspaceDataKeys } from '@/services/storageKeys';
import { storage } from '@/services/storage';
import { useCanvasStore } from '@/stores/canvasStore';
import { usePreferencesStore } from '@/stores/preferences';
import { useSessionBootStore } from '@/stores/sessionBoot';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function sensitiveKeysFor(workspaceId: string): string[] {
  const keys = workspaceDataKeys(workspaceId);
  return [keys.dayPlan, keys.sessions, keys.notifications, keys.homeBrief];
}

export type ClearSessionResult = {
  /** False when SecureStore clear failed — local data was still wiped. */
  authCleared: boolean;
};

function wipeLocalWorkspaceData() {
  offlineQueue.clear();

  const workspaceId = getActiveWorkspaceId();
  for (const key of sensitiveKeysFor(workspaceId)) {
    storage.remove(key);
  }
  for (const key of Object.values(LEGACY_KEYS)) {
    storage.remove(key);
  }

  // Drop stale workspace pointer so the next session re-resolves cleanly.
  storage.remove(GLOBAL_KEYS.activeWorkspaceId);

  queryClient.clear();
  useCanvasStore.getState().close();
  useWorkspaceStore.getState().resetAfterLogout();
  // Critical: otherwise sign-in bounces straight to Home with old flags/cache.
  usePreferencesStore.getState().resetOnboarding();
}

/**
 * Clear auth secrets + local workspace data on log out.
 * Theme preference is kept so the shell does not flash.
 * Local wipe always runs even if SecureStore fails.
 */
export async function clearUserSession(): Promise<ClearSessionResult> {
  // Reset server onboarding while auth is still valid — otherwise re-login
  // jumps straight to Home again.
  try {
    await authService.setOnboardingCompleted(false);
  } catch (error) {
    if (__DEV__) {
      console.warn('[clearUserSession] onboarding reset failed', error);
    }
  }

  let authCleared = true;
  try {
    await authService.signOut();
  } catch (error) {
    authCleared = false;
    if (__DEV__) {
      console.warn('[clearUserSession] auth clear failed', error);
    }
  }

  try {
    wipeLocalWorkspaceData();
  } catch (error) {
    if (__DEV__) {
      console.warn('[clearUserSession] local wipe failed', error);
    }
    throw error instanceof Error ? error : new Error('Failed to clear local session data.');
  }

  useSessionBootStore.getState().markSignedOut();

  return { authCleared };
}
