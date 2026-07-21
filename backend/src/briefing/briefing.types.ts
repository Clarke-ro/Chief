/** HomeBrief-shaped API contract shared with the Expo client. */

export type FocusActionExecution = 'ask_chief' | 'handoff';

/** A trusted destination emitted by the briefing service for a source item. */
export type FocusHandoffTarget = 'gmail' | 'calendar';

export type FocusHandoffDto = {
  target: FocusHandoffTarget;
  url: string;
  summary?: string;
};

export type FocusActionDto = {
  id: string;
  label: string;
  tone?: 'neutral' | 'accent';
  /** Explicit execution prevents the client from guessing from a label. */
  execution?: FocusActionExecution;
  /** Present only when Chief has a verified external destination. */
  handoff?: FocusHandoffDto;
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
  /** Context-aware Focus detail section: what this is about. */
  aboutTitle: string;
  aboutBody: string;
  /** Context-aware Focus detail section: what to do next. */
  actionTitle: string;
  actionBody: string;
  /** @deprecated Prefer aboutBody — kept for older clients. */
  whyImportant: string;
  /** @deprecated Prefer actionBody — kept for older clients. */
  delayImpact: string;
  aiRecommendation: string;
};

export type BriefingSignalDto = {
  id: string;
  platform: string;
  title: string;
  summary: string;
  timestamp: string;
  /** Chief-of-Staff section for Brief grouping (not the source app). */
  section?: string;
};

export type HomeBriefDto = {
  userName: string;
  successScore: number;
  successLabel: string;
  successInsight: string;
  focus: FocusItemDto[];
  briefing: BriefingSignalDto[];
  /** ISO timestamp when this brief snapshot was composed. */
  generatedAt?: string;
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
