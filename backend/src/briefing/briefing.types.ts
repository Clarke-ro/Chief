/** HomeBrief-shaped API contract shared with the Expo client. */

export type FocusActionDto = {
  id: string;
  label: string;
  tone?: 'neutral' | 'accent';
};

export type FocusItemDto = {
  id: string;
  platform: string;
  title: string;
  reason: string;
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  actions: FocusActionDto[];
  urgencyLabel: string;
  whyImportant: string;
  delayImpact: string;
  aiRecommendation: string;
};

export type BriefingSignalDto = {
  id: string;
  platform: string;
  title: string;
  summary: string;
  timestamp: string;
};

export type HomeBriefDto = {
  userName: string;
  successScore: number;
  successLabel: string;
  successInsight: string;
  focus: FocusItemDto[];
  briefing: BriefingSignalDto[];
};

export function isHomeBriefDto(value: unknown): value is HomeBriefDto {
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
