import { env } from '@/config/env';
import type { Task, TaskSectionKey, TaskStatus } from '@/features/tasks/types';
import { taskInventory } from '@/mock/tasks/inventory';
import { ensureActiveWorkspaceId } from '@/services/activeWorkspace';
import { apiJson, ApiError, ApiNetworkError } from '@/services/api/client';
import { paginateArray, type PageParams, type PageResult } from '@/services/api/pagination';
import { usePreferencesStore } from '@/stores/preferences';

const PLATFORMS = new Set([
  'gmail',
  'calendar',
  'slack',
  'github',
  'notion',
  'asana',
  'trello',
]);
const PRIORITIES = new Set(['high', 'medium', 'low']);
const STATUSES = new Set<TaskStatus>(['ready', 'in_progress', 'waiting', 'done']);
const SECTIONS = new Set<TaskSectionKey>(['today', 'upcoming', 'waiting', 'completed']);

function shouldUseMockFallback(): boolean {
  return !usePreferencesStore.getState().onboardingCompleted;
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.description === 'string' &&
    typeof task.details === 'string' &&
    typeof task.platform === 'string' &&
    PLATFORMS.has(task.platform) &&
    typeof task.priority === 'string' &&
    PRIORITIES.has(task.priority) &&
    typeof task.estimatedTime === 'string' &&
    typeof task.estimatedMinutes === 'number' &&
    typeof task.status === 'string' &&
    STATUSES.has(task.status as TaskStatus) &&
    typeof task.section === 'string' &&
    SECTIONS.has(task.section as TaskSectionKey) &&
    typeof task.dueLabel === 'string'
  );
}

function normalizeTask(value: unknown): Task | null {
  return isTask(value) ? value : null;
}

/** Task inventory — live synced + user tasks when Home brief is live. */
export const taskRepository = {
  list(): Task[] {
    return taskInventory;
  },

  listPage(params?: PageParams): PageResult<Task> {
    return paginateArray(taskInventory, params);
  },

  getById(id: string): Task | undefined {
    return taskInventory.find((task) => task.id === id);
  },

  async fetchList(options?: {
    workspaceId?: string;
    section?: TaskSectionKey;
  }): Promise<Task[]> {
    if (!env.isApiConfigured || !env.liveHomeBrief) {
      return shouldUseMockFallback() ? [...taskInventory] : [];
    }

    const wsId = options?.workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const query = new URLSearchParams({ workspaceId: wsId });
    if (options?.section) query.set('section', options.section);

    try {
      const live = await apiJson<unknown>(`/v1/workspace/tasks?${query.toString()}`);
      if (!Array.isArray(live)) return [];
      return live.map(normalizeTask).filter((task): task is Task => Boolean(task));
    } catch (error) {
      if (__DEV__) {
        const label =
          error instanceof ApiError
            ? `HTTP ${error.status}`
            : error instanceof ApiNetworkError
              ? error.message
              : 'unknown';
        console.warn('[taskRepository] live list failed', label);
      }
      return shouldUseMockFallback() ? [...taskInventory] : [];
    }
  },

  async fetchById(id: string, workspaceId?: string): Promise<Task | undefined> {
    if (!env.isApiConfigured || !env.liveHomeBrief) {
      return taskRepository.getById(id);
    }

    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const query = new URLSearchParams({ workspaceId: wsId });
    try {
      const live = await apiJson<unknown>(
        `/v1/workspace/tasks/${encodeURIComponent(id)}?${query.toString()}`,
      );
      return normalizeTask(live) ?? undefined;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return undefined;
      if (__DEV__) {
        console.warn('[taskRepository] live getById failed', error);
      }
      return shouldUseMockFallback() ? taskRepository.getById(id) : undefined;
    }
  },

  async create(
    input: {
      title: string;
      description?: string;
      details?: string;
      platform?: Task['platform'];
      priority?: Task['priority'];
      section?: TaskSectionKey;
      estimatedTime?: string;
      estimatedMinutes?: number;
      dueLabel?: string;
    },
    workspaceId?: string,
  ): Promise<Task> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const created = await apiJson<unknown>('/v1/workspace/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId, ...input }),
    });
    const normalized = normalizeTask(created);
    if (!normalized) throw new ApiNetworkError('Invalid task from API.');
    return normalized;
  },

  async update(
    id: string,
    patch: Partial<Task>,
    workspaceId?: string,
  ): Promise<Task> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const updated = await apiJson<unknown>(
      `/v1/workspace/tasks/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId, ...patch }),
      },
    );
    const normalized = normalizeTask(updated);
    if (!normalized) throw new ApiNetworkError('Invalid task from API.');
    return normalized;
  },

  async complete(id: string, workspaceId?: string): Promise<Task> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const updated = await apiJson<unknown>(
      `/v1/workspace/tasks/${encodeURIComponent(id)}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId }),
      },
    );
    const normalized = normalizeTask(updated);
    if (!normalized) throw new ApiNetworkError('Invalid task from API.');
    return normalized;
  },

  async remove(id: string, workspaceId?: string): Promise<void> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const query = new URLSearchParams({ workspaceId: wsId });
    await apiJson(`/v1/workspace/tasks/${encodeURIComponent(id)}?${query.toString()}`, {
      method: 'DELETE',
    });
  },
};
