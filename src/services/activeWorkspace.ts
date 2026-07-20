import { DEFAULT_WORKSPACE_ID, type WorkspaceId } from '@/config/workspace';
import { authClient } from '@/services/auth/authClient';
import { GLOBAL_KEYS } from '@/services/storageKeys';
import { storage } from '@/services/storage';

/** Accept Prisma cuid / cuid2 / uuid — reject placeholders like "default". */
export function isWorkspaceUuid(id: string): boolean {
  const value = id.trim();
  if (!value || value === DEFAULT_WORKSPACE_ID) return false;
  // UUID
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    return true;
  }
  // Prisma cuid / cuid2 (e.g. cmrt1bo2q0000lm018f70nkjd)
  return /^c[a-z0-9]{20,}$/i.test(value);
}

export function getActiveWorkspaceId(): WorkspaceId {
  const value = storage.getString(GLOBAL_KEYS.activeWorkspaceId)?.trim();
  return value || DEFAULT_WORKSPACE_ID;
}

export function persistActiveWorkspaceId(id: WorkspaceId): WorkspaceId {
  const next = id.trim() || DEFAULT_WORKSPACE_ID;
  storage.set(GLOBAL_KEYS.activeWorkspaceId, next);
  return next;
}

/** Returns a real backend workspace id, bootstrapping from `/v1/me` when needed. */
export async function ensureActiveWorkspaceId(): Promise<string> {
  const current = getActiveWorkspaceId();
  if (isWorkspaceUuid(current)) {
    return current;
  }

  const session = await authClient.getSession();
  if (!session.data?.session) {
    throw new Error('Not signed in.');
  }

  const { authService } = await import('@/services/auth/authService');
  const me = await authService.bootstrapSession();
  const workspaceId = me.workspaces[0]?.id;
  if (!workspaceId || !isWorkspaceUuid(workspaceId)) {
    throw new Error('No workspace is available for this account.');
  }

  return persistActiveWorkspaceId(workspaceId);
}
