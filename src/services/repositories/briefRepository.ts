import { env } from '@/config/env';
import type { FocusItem, HomeBrief } from '@/features/brief/types';
import { homeBrief as mockHomeBrief } from '@/mock/briefings/homeBrief';
import { ensureActiveWorkspaceId, getActiveWorkspaceId } from '@/services/activeWorkspace';
import { apiJson, ApiError, ApiNetworkError } from '@/services/api/client';
import { workspaceDataKeys } from '@/services/storageKeys';
import { storage } from '@/services/storage';
import { usePreferencesStore } from '@/stores/preferences';

function isHomeBrief(value: unknown): value is HomeBrief {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.userName === 'string' &&
    typeof record.successScore === 'number' &&
    typeof record.successLabel === 'string' &&
    typeof record.successInsight === 'string' &&
    Array.isArray(record.focus) &&
    Array.isArray(record.briefing)
  );
}

function cacheKey(workspaceId?: string): string {
  return workspaceDataKeys(workspaceId ?? getActiveWorkspaceId()).homeBrief;
}

function readCachedBrief(workspaceId?: string): HomeBrief | null {
  try {
    const raw = storage.getString(cacheKey(workspaceId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isHomeBrief(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedBrief(brief: HomeBrief, workspaceId?: string): void {
  try {
    storage.set(cacheKey(workspaceId), JSON.stringify(brief));
  } catch (error) {
    if (__DEV__) {
      console.warn('[briefRepository] cache write failed', error);
    }
  }
}

function emptyBrief(userName = 'there'): HomeBrief {
  return {
    userName,
    successScore: 0.42,
    successLabel: 'Getting started',
    successInsight:
      'Connect your work apps — Chief will surface deadlines, meetings, and actions that matter.',
    focus: [],
    briefing: [],
  };
}

function shouldUseMockFallback(): boolean {
  // After onboarding with a live API, never paint mock seed data.
  if (env.isApiConfigured && usePreferencesStore.getState().onboardingCompleted) {
    return false;
  }
  return !env.liveHomeBrief;
}

/** Seed for Home brief + focus. Live reads go through `fetchHomeBrief` when flagged. */
export const briefRepository = {
  /** Cache-first snapshot for instant Home paint (never mock after onboarding). */
  getHomeBrief(workspaceId?: string): HomeBrief {
    const cached = readCachedBrief(workspaceId);
    if (cached) return cached;
    if (shouldUseMockFallback()) return mockHomeBrief;
    return emptyBrief();
  },

  getFocusById(id: string): FocusItem | undefined {
    return briefRepository.getHomeBrief().focus.find((item) => item.id === id);
  },

  listFocus(): FocusItem[] {
    return briefRepository.getHomeBrief().focus;
  },

  listBriefing() {
    return briefRepository.getHomeBrief().briefing;
  },

  persistCache(brief: HomeBrief, workspaceId?: string): void {
    writeCachedBrief(brief, workspaceId);
  },

  clearCache(workspaceId?: string): void {
    try {
      storage.remove(cacheKey(workspaceId));
    } catch {
      /* ignore */
    }
  },

  /**
   * Live brief when API is configured.
   * After onboarding: cache on success; on failure keep cache / empty — never mock.
   */
  async fetchHomeBrief(workspaceId?: string): Promise<HomeBrief> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const cached = readCachedBrief(wsId);

    if (!env.isApiConfigured) {
      return shouldUseMockFallback() ? mockHomeBrief : cached ?? emptyBrief();
    }

    if (!env.liveHomeBrief && shouldUseMockFallback()) {
      return mockHomeBrief;
    }

    try {
      const query = new URLSearchParams({ workspaceId: wsId });
      const live = await apiJson<unknown>(`/v1/workspace/brief?${query.toString()}`);
      if (isHomeBrief(live)) {
        writeCachedBrief(live, wsId);
        return live;
      }
      if (__DEV__) {
        console.warn('[briefRepository] live brief shape invalid — keeping cache');
      }
      return cached ?? emptyBrief();
    } catch (error) {
      if (__DEV__) {
        const label =
          error instanceof ApiError
            ? `HTTP ${error.status}`
            : error instanceof ApiNetworkError
              ? error.message
              : 'unknown';
        console.warn('[briefRepository] live brief failed — keeping cache', label);
      }
      if (cached) return cached;
      return shouldUseMockFallback() ? mockHomeBrief : emptyBrief();
    }
  },

  async completeFocus(sourceKey: string, workspaceId?: string): Promise<HomeBrief> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const live = await apiJson<unknown>(
      `/v1/workspace/focus/${encodeURIComponent(sourceKey)}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId }),
      },
    );
    if (isHomeBrief(live)) {
      writeCachedBrief(live, wsId);
      return live;
    }
    return briefRepository.fetchHomeBrief(wsId);
  },
};
