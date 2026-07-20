import { DEFAULT_WORKSPACE_ID, type WorkspaceId } from '@/config/workspace';
import { GLOBAL_KEYS } from '@/services/storageKeys';
import { storage } from '@/services/storage';

export function getActiveWorkspaceId(): WorkspaceId {
  const value = storage.getString(GLOBAL_KEYS.activeWorkspaceId)?.trim();
  return value || DEFAULT_WORKSPACE_ID;
}

export function persistActiveWorkspaceId(id: WorkspaceId): WorkspaceId {
  const next = id.trim() || DEFAULT_WORKSPACE_ID;
  storage.set(GLOBAL_KEYS.activeWorkspaceId, next);
  return next;
}
