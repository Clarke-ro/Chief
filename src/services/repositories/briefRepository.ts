import { env } from '@/config/env';
import type { FocusItem, HomeBrief } from '@/features/brief/types';
import { ensureActiveWorkspaceId, getActiveWorkspaceId } from '@/services/activeWorkspace';
import { apiJson, ApiError, ApiNetworkError } from '@/services/api/client';
import { workspaceDataKeys } from '@/services/storageKeys';
import { storage } from '@/services/storage';

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

/** Home brief + focus — cache / live API only (no mock seed). */
export const briefRepository = {
  /** Cache-first snapshot for instant Home paint. */
  getHomeBrief(workspaceId?: string): HomeBrief {
    return readCachedBrief(workspaceId) ?? emptyBrief();
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

  /** Live brief when API is configured; otherwise cache / empty. */
  async fetchHomeBrief(workspaceId?: string): Promise<HomeBrief> {
    const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const cached = readCachedBrief(wsId);

    if (!env.isApiConfigured) {
      return cached ?? emptyBrief();
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
      return cached ?? emptyBrief();
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
