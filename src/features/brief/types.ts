import type { PlatformId, PriorityLevel } from '@/components/ui';
import type { HandoffTarget } from '@/features/actions/types';

export type FocusActionTone = 'neutral' | 'accent';
export type FocusActionExecution = 'ask_chief' | 'handoff';

export type FocusActionHandoff = {
  target: HandoffTarget;
  url: string;
  summary?: string;
};

/** One-tap action suggested for a focus item (Ask Chief, draft, reschedule, …). */
export type FocusAction = {
  id: string;
  label: string;
  tone?: FocusActionTone;
  /** Execution comes from the source-aware briefing contract, never label inference. */
  execution?: FocusActionExecution;
  /** Present only when a verified source destination is available. */
  handoff?: FocusActionHandoff;
};

export type FocusItem = {
  id: string;
  platform: PlatformId;
  title: string;
  /** One-line explanation of why this matters today */
  reason: string;
  estimatedTime: string;
  priority: PriorityLevel;
  confidence: number;
  /** Context-specific actions shown under the focus item */
  actions: FocusAction[];
  /** All-caps urgency chip on the detail screen */
  urgencyLabel: string;
  /** Focus detail — what this is about (context-aware title). */
  aboutTitle?: string;
  aboutBody?: string;
  /** Focus detail — what to do next (context-aware title). */
  actionTitle?: string;
  actionBody?: string;
  /** @deprecated Prefer aboutBody */
  whyImportant: string;
  /** @deprecated Prefer actionBody */
  delayImpact: string;
  /** Short recommendation line */
  aiRecommendation: string;
};

export type BriefingSignal = {
  id: string;
  platform: PlatformId;
  title: string;
  summary: string;
  timestamp: string;
  /** Chief-of-Staff Brief section (Needs Attention, Security, …). */
  section?: string;
};

export type HomeBrief = {
  userName: string;
  successScore: number;
  successLabel: string;
  successInsight: string;
  focus: FocusItem[];
  briefing: BriefingSignal[];
};

export const PRIORITY_STARS: Record<PriorityLevel, number> = {
  high: 5,
  medium: 3,
  low: 2,
};
