import { DEFAULT_WORKSPACE_ID, type WorkspaceId } from '@/config/workspace';

/**
 * TanStack Query key factory — always workspace-scoped for multi-tenant cache isolation.
 */
export const queryKeys = {
  root: ['chief'] as const,

  workspace: (workspaceId: WorkspaceId = DEFAULT_WORKSPACE_ID) =>
    [...queryKeys.root, 'workspace', workspaceId] as const,

  brief: (workspaceId?: WorkspaceId) =>
    [...queryKeys.workspace(workspaceId), 'brief'] as const,

  dayPlan: (workspaceId?: WorkspaceId) =>
    [...queryKeys.workspace(workspaceId), 'dayPlan'] as const,

  tasks: (workspaceId?: WorkspaceId) =>
    [...queryKeys.workspace(workspaceId), 'tasks'] as const,

  task: (workspaceId: WorkspaceId, taskId: string) =>
    [...queryKeys.tasks(workspaceId), taskId] as const,

  chiefSessions: (workspaceId?: WorkspaceId) =>
    [...queryKeys.workspace(workspaceId), 'chief', 'sessions'] as const,

  analytics: (workspaceId?: WorkspaceId) =>
    [...queryKeys.workspace(workspaceId), 'analytics'] as const,

  profile: (workspaceId?: WorkspaceId) =>
    [...queryKeys.workspace(workspaceId), 'profile'] as const,

  integrations: (workspaceId?: WorkspaceId) =>
    [...queryKeys.workspace(workspaceId), 'integrations'] as const,
} as const;
