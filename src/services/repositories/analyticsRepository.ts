import type { AnalyticsSnapshot } from '@/features/analytics/types';
import { analyticsSnapshot } from '@/mock/analytics/snapshot';

/** Seed for analytics. Live snapshot lives in workspaceStore (synced with Today). */
export const analyticsRepository = {
  getSnapshot(): AnalyticsSnapshot {
    return analyticsSnapshot;
  },
};
