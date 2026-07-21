import { env } from '@/config/env';
import type { DayPlanItem, DayPlanStatus, ScheduleBlockKind, SweepPhase } from '@/features/tasks/types';
import { dayPlanSeed } from '@/mock/tasks/dayPlan';
import { ensureActiveWorkspaceId, getActiveWorkspaceId } from '@/services/activeWorkspace';
import { apiJson, ApiError, ApiNetworkError } from '@/services/api/client';
import { workspaceDataKeys } from '@/services/storageKeys';
import { storage } from '@/services/storage';
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
const STATUSES = new Set<DayPlanStatus>(['completed', 'in_progress', 'upcoming']);
const BLOCK_KINDS = new Set<ScheduleBlockKind>(['normal', 'major']);
const SWEEP_PHASES = new Set<SweepPhase>(['none', 'checking', 'cleared', 'still_open']);

function cacheKey(workspaceId?: string): string {
  return workspaceDataKeys(workspaceId ?? getActiveWorkspaceId()).dayPlan;
}

function isDayPlanItem(value: unknown): value is DayPlanItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || typeof item.time !== 'string') return false;
  if (typeof item.title !== 'string' || typeof item.subtitle !== 'string') return false;
  if (typeof item.platform !== 'string' || !PLATFORMS.has(item.platform)) return false;
  if (typeof item.status !== 'string' || !STATUSES.has(item.status as DayPlanStatus)) {
    return false;
  }
  if (item.blockKind != null && !BLOCK_KINDS.has(item.blockKind as ScheduleBlockKind)) {
    return false;
  }
  if (item.sweepPhase != null && !SWEEP_PHASES.has(item.sweepPhase as SweepPhase)) {
    return false;
  }
  return true;
}

function readCached(workspaceId?: string): DayPlanItem[] | null {
  try {
    const raw = storage.getString(cacheKey(workspaceId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const items = parsed.filter(isDayPlanItem);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

function writeCached(items: DayPlanItem[], workspaceId?: string): void {
  try {
    storage.set(cacheKey(workspaceId), JSON.stringify(items));
  } catch (error) {
    if (__DEV__) {
      console.warn('[dayPlanRepository] cache write failed', error);
    }
  }
}

function shouldUseMockFallback(): boolean {
  return !usePreferencesStore.getState().onboardingComplete;
}

function normalizeItem(raw: unknown): DayPlanItem | null {
  if (!isDayPlanItem(raw)) return null;
  return raw;
}

/** Today schedule — live when Home brief is live; MMKV cache; mock seed only pre-onboarding. */
export const dayPlanRepository = {
  getSeed(): DayPlanItem[] {
    return dayPlanSeed.map((item) => ({ ...item }));
  },

  readCache(workspaceId?: string): DayPlanItem[] | null {
    return readCached(workspaceId);
  },

  persistCache(items: DayPlanItem[], workspaceId?: string): void {
    writeCached(items, workspaceId);
  },

  async fetchDayPlan(workspaceId?: string): Promise<DayPlanItem[]> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const cached = readCached(wsId);

    if (!env.isApiConfigured || !env.liveHomeBrief) {
      return shouldUseMockFallback()
        ? dayPlanRepository.getSeed()
        : cached ?? (shouldUseMockFallback() ? dayPlanRepository.getSeed() : []);
    }

    try {
      const query = new URLSearchParams({ workspaceId: wsId });
      const live = await apiJson<unknown>(`/v1/workspace/schedule?${query.toString()}`);
      if (!Array.isArray(live)) {
        return cached ?? [];
      }
      const items = live.map(normalizeItem).filter((item): item is DayPlanItem => Boolean(item));
      writeCached(items, wsId);
      return items;
    } catch (error) {
      if (__DEV__) {
        const label =
          error instanceof ApiError
            ? `HTTP ${error.status}`
            : error instanceof ApiNetworkError
              ? error.message
              : 'unknown';
        console.warn('[dayPlanRepository] live fetch failed — keeping cache', label);
      }
      if (cached) return cached;
      return shouldUseMockFallback() ? dayPlanRepository.getSeed() : [];
    }
  },

  async create(
    item: Omit<DayPlanItem, 'id'> & { id?: string },
    workspaceId?: string,
  ): Promise<DayPlanItem> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const created = await apiJson<DayPlanItem>('/v1/workspace/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: wsId,
        title: item.title,
        subtitle: item.subtitle,
        platform: item.platform,
        time: item.time,
        status: item.status,
        duration: item.duration,
        attendees: item.attendees,
        blockKind: item.blockKind,
        focusId: item.focusId,
      }),
    });
    const normalized = normalizeItem(created);
    if (!normalized) throw new ApiNetworkError('Invalid schedule item from API.');
    return normalized;
  },

  async update(
    id: string,
    patch: Partial<DayPlanItem>,
    workspaceId?: string,
  ): Promise<DayPlanItem> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const updated = await apiJson<DayPlanItem>(
      `/v1/workspace/schedule/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: wsId,
          title: patch.title,
          subtitle: patch.subtitle,
          platform: patch.platform,
          time: patch.time,
          status: patch.status,
          duration: patch.duration,
          attendees: patch.attendees,
          blockKind: patch.blockKind,
          focusId: patch.focusId,
          sweepPhase: patch.sweepPhase,
          lastSweepAt: patch.lastSweepAt,
        }),
      },
    );
    const normalized = normalizeItem(updated);
    if (!normalized) throw new ApiNetworkError('Invalid schedule item from API.');
    return normalized;
  },

  async remove(id: string, workspaceId?: string): Promise<void> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const query = new URLSearchParams({ workspaceId: wsId });
    await apiJson(`/v1/workspace/schedule/${encodeURIComponent(id)}?${query.toString()}`, {
      method: 'DELETE',
    });
  },
};
