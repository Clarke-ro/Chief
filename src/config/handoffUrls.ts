import type { HandoffTarget } from '@/features/actions/types';

/**
 * Canonical handoff destinations for external apps.
 * Public marketing/app URLs only — never auth endpoints or API keys.
 */
export const HANDOFF_URLS = {
  github: 'https://github.com',
  gmail: 'mailto:',
  slack: 'https://slack.com',
  calendar: 'https://calendar.google.com',
  notion: 'https://notion.so',
} as const satisfies Partial<Record<HandoffTarget, string>>;

export function handoffUrlFor(target?: HandoffTarget): string | undefined {
  if (!target || target === 'generic') return undefined;
  return HANDOFF_URLS[target as keyof typeof HANDOFF_URLS];
}
