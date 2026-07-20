import { env } from '@/config/env';
import type { FocusItem, HomeBrief } from '@/features/brief/types';
import { homeBrief } from '@/mock/briefings/homeBrief';
import { ensureActiveWorkspaceId } from '@/services/activeWorkspace';
import { apiJson, ApiError, ApiNetworkError } from '@/services/api/client';

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

/** Seed for Home brief + focus. Live reads go through `fetchHomeBrief` when flagged. */
export const briefRepository = {
  getHomeBrief(): HomeBrief {
    return homeBrief;
  },

  getFocusById(id: string): FocusItem | undefined {
    return homeBrief.focus.find((item) => item.id === id);
  },

  listFocus(): FocusItem[] {
    return homeBrief.focus;
  },

  listBriefing() {
    return homeBrief.briefing;
  },

  /**
   * Live brief when `EXPO_PUBLIC_LIVE_HOME_BRIEF` is on; otherwise mock.
   * Network / auth / shape failures fall back to the seed brief.
   */
  async fetchHomeBrief(workspaceId?: string): Promise<HomeBrief> {
    if (!env.liveHomeBrief) {
      return homeBrief;
    }

    try {
      const wsId = workspaceId?.trim() || (await ensureActiveWorkspaceId());
      const query = new URLSearchParams({ workspaceId: wsId });
      const live = await apiJson<unknown>(`/v1/workspace/brief?${query.toString()}`);
      if (isHomeBrief(live)) {
        return live;
      }
      if (__DEV__) {
        console.warn('[briefRepository] live brief shape invalid — using mock');
      }
      return homeBrief;
    } catch (error) {
      if (__DEV__) {
        const label =
          error instanceof ApiError
            ? `HTTP ${error.status}`
            : error instanceof ApiNetworkError
              ? error.message
              : 'unknown';
        console.warn('[briefRepository] live brief failed — using mock', label);
      }
      return homeBrief;
    }
  },
};
