import { authSession } from '@/services/api/authSession';
import { queryClient } from '@/services/queryClient';
import { getActiveWorkspaceId } from '@/services/activeWorkspace';
import { offlineQueue } from '@/services/sync/offlineQueue';
import { LEGACY_KEYS, workspaceDataKeys } from '@/services/storageKeys';
import { storage } from '@/services/storage';
import { useCanvasStore } from '@/stores/canvasStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function sensitiveKeysFor(workspaceId: string): string[] {
  const keys = workspaceDataKeys(workspaceId);
  return [keys.dayPlan, keys.sessions, keys.notifications];
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

  queryClient.clear();
  useCanvasStore.getState().close();
  useWorkspaceStore.getState().resetAfterLogout();
}

/**
 * Clear auth secrets + local workspace data on log out.
 * Theme preference is kept so the shell does not flash.
 * Local wipe always runs even if SecureStore fails.
 */
export async function clearUserSession(): Promise<ClearSessionResult> {
  let authCleared = true;
  try {
    await authSession.clear();
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

  return { authCleared };
}
