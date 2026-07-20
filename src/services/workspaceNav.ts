import { router } from 'expo-router';

import type { DayPlanItem } from '@/features/tasks/types';

export type AskChiefOptions = {
  focusId?: string;
};

type TabHref = '/home' | '/tasks' | '/chief' | '/analytics' | '/profile';

function goTab(href: TabHref) {
  // navigate switches tabs without stacking duplicate (tabs) entries
  router.navigate(href);
}

/**
 * Cross-tab / stack navigation intents.
 * Prefer this over ad-hoc `router.push` so routing stays predictable.
 */
export const workspaceNav = {
  home() {
    goTab('/home');
  },

  today() {
    goTab('/tasks');
  },

  chief() {
    goTab('/chief');
  },

  analytics() {
    goTab('/analytics');
  },

  profile() {
    goTab('/profile');
  },

  /** Stack push — Focus detail over tabs */
  focus(id: string) {
    const trimmed = id.trim();
    if (!trimmed) return;
    router.push({ pathname: '/focus/[id]', params: { id: trimmed } });
  },

  /** Stack push — inventory task detail (deep link / legacy) */
  task(id: string) {
    const trimmed = id.trim();
    if (!trimmed) return;
    router.push({ pathname: '/task/[id]', params: { id: trimmed } });
  },

  /**
   * Pop if possible; otherwise run fallback (default: Home).
   * Avoids blank exits from cold deep links.
   */
  back(fallback: () => void = () => goTab('/home')) {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    fallback();
  },

  /** Hand a prompt (and optional focus context) to Chief. */
  askChief(prompt: string, options?: AskChiefOptions) {
    const text = prompt.trim();
    if (!text) {
      goTab('/chief');
      return;
    }
    router.navigate({
      pathname: '/chief',
      params: {
        prompt: text,
        // nonce so repeat asks while already on Chief still apply
        nav: String(Date.now()),
        ...(options?.focusId ? { focusId: options.focusId } : {}),
      },
    });
  },

  /** Build a Chief prompt for a Today schedule block (dispatch via actionRouter). */
  schedulePrompt(item: DayPlanItem): string {
    return [
      `Help me with today's schedule block "${item.title}" at ${item.time}.`,
      item.subtitle ? `Notes: ${item.subtitle}.` : null,
      item.blockKind === 'major'
        ? 'This is a major focus block — prioritize clearing blockers.'
        : null,
      item.focusId ? `Linked focus id: ${item.focusId}.` : null,
      'What should I do next?',
    ]
      .filter(Boolean)
      .join(' ');
  },

  /** Build a Chief prompt for Analytics (dispatch via actionRouter). */
  analyticsPrompt(scorePercent: number, insight: string): string {
    return `My productivity score is ${scorePercent}%. Insight: ${insight} What should I change tomorrow?`;
  },
};
