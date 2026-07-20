import { DEFAULT_WORKSPACE_ID, type WorkspaceId } from '@/config/workspace';

/** App-global keys (not workspace-scoped). */
export const GLOBAL_KEYS = {
  theme: 'chief.theme',
  onboardingCompleted: 'chief.onboarding.completed',
  activeWorkspaceId: 'chief.workspace.active',
  offlineQueue: 'chief.offlineQueue.v1',
} as const;

/**
 * Workspace-scoped MMKV keys.
 * Pattern: `chief.ws.<workspaceId>.<leaf>` — supports multi-workspace without collisions.
 */
export function workspaceKey(workspaceId: WorkspaceId, leaf: string): string {
  const id = workspaceId.trim() || DEFAULT_WORKSPACE_ID;
  return `chief.ws.${id}.${leaf}`;
}

export function workspaceDataKeys(workspaceId: WorkspaceId) {
  return {
    dayPlan: workspaceKey(workspaceId, 'dayPlan.v2'),
    sessions: workspaceKey(workspaceId, 'sessions.v1'),
    notifications: workspaceKey(workspaceId, 'profile.notifications.v1'),
  } as const;
}

/** Legacy unscoped keys — migrated on first read. */
export const LEGACY_KEYS = {
  dayPlan: 'chief.dayPlan.v2',
  sessions: 'chief.sessions.v1',
  notifications: 'chief.profile.notifications.v1',
} as const;
