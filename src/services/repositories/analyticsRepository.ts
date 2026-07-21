import type { AnalyticsSnapshot } from '@/features/analytics/types';

const emptyAnalytics: AnalyticsSnapshot = {
  productivity: {
    score: 0,
    weeklyChange: 0,
    monthlyTrend: [],
    insight: '',
  },
  aiImpact: [],
  workBreakdown: [],
  performance: [],
  weeklyTrends: [],
  achievements: [],
};

/** Analytics snapshot — empty until live analytics ships. */
export const analyticsRepository = {
  getSnapshot(): AnalyticsSnapshot {
    return emptyAnalytics;
  },
};
