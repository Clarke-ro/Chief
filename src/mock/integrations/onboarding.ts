import type { OnboardingApp } from '@/features/onboarding/types';

export const ONBOARDING_APPS: OnboardingApp[] = [
  {
    id: 'gmail',
    platform: 'gmail',
    name: 'Gmail',
    blurb: 'Threads that need a decision today',
  },
  {
    id: 'calendar',
    platform: 'calendar',
    name: 'Google Calendar',
    blurb: 'Meetings, focus blocks, conflicts',
  },
  {
    id: 'slack',
    platform: 'slack',
    name: 'Slack',
    blurb: 'Mentions that block other people',
  },
  {
    id: 'github',
    platform: 'github',
    name: 'GitHub',
    blurb: 'Reviews waiting on you',
  },
  {
    id: 'notion',
    platform: 'notion',
    name: 'Notion',
    blurb: 'Docs tied to active work',
  },
  {
    id: 'zoom',
    platform: 'zoom',
    name: 'Zoom',
    blurb: 'Upcoming calls on your day',
  },
];

export const FIRST_BRIEF_ITEMS = [
  {
    id: 'b1',
    title: 'Reply to investor email',
    reason: 'Draft is ready — a same-day reply keeps momentum.',
    priority: 'high' as const,
  },
  {
    id: 'b2',
    title: 'Review PR #182',
    reason: 'Blocks deployment of the payment flow.',
    priority: 'high' as const,
  },
  {
    id: 'b3',
    title: 'Protect 10:30 focus block',
    reason: 'Calendar conflict detected with a low-priority sync.',
    priority: 'medium' as const,
  },
];

/**
 * Defining-moment insights shown right after the workspace scan.
 * Prefer the first match whose `requires` apps are connected; else fall back.
 */
export type ScanInsight = {
  id: string;
  /** Highlight line — the memorable punch */
  headline: string;
  /** Quiet supporting context */
  detail: string;
  /** Optional apps that make this insight feel earned */
  requires?: OnboardingApp['id'][];
};

export const SCAN_INSIGHTS: ScanInsight[] = [
  {
    id: 'noise',
    headline: 'I found 27 notifications you don’t need to look at today.',
    detail: 'Chief filtered the noise so only decisions that move work forward stay on your radar.',
    requires: ['slack', 'gmail'],
  },
  {
    id: 'meeting',
    headline: 'Your 2 PM meeting can safely move to tomorrow without affecting any deadlines.',
    detail: 'No blockers depend on it today — reclaiming that hour protects your focus block.',
    requires: ['calendar'],
  },
  {
    id: 'review',
    headline: 'Two pull requests are waiting on you — one is blocking a deploy.',
    detail: 'Chief ranked them so you clear the critical path before anything else.',
    requires: ['github'],
  },
  {
    id: 'fallback',
    headline: 'I found 27 notifications you don’t need to look at today.',
    detail: 'Chief already separated what can wait — so your first brief only carries what matters.',
  },
];
