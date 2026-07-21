import type { AnalyticsSnapshot } from '@/features/analytics/types';

/** Intentionally empty — analytics UI is not live yet. */
export const analyticsSnapshot: AnalyticsSnapshot = {
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
