export type ProductivityScore = {
  score: number;
  weeklyChange: number;
  monthlyTrend: number[];
  insight: string;
};

export type AiImpactMetric = {
  id: string;
  label: string;
  value: number;
  suffix?: string;
};

export type WorkCategory = {
  id: string;
  label: string;
  /** Share of time 0–1 */
  share: number;
  hours: number;
};

export type PerformanceMetric = {
  id: string;
  label: string;
  value: string;
  detail?: string;
};

export type TrendSeries = {
  id: string;
  label: string;
  /** Monday → Sunday normalized points */
  points: number[];
};

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  earned: boolean;
};

export type AnalyticsSnapshot = {
  productivity: ProductivityScore;
  aiImpact: AiImpactMetric[];
  workBreakdown: WorkCategory[];
  performance: PerformanceMetric[];
  weeklyTrends: TrendSeries[];
  achievements: Achievement[];
};
