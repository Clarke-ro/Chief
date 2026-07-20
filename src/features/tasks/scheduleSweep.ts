import type { BriefingSignal, FocusItem } from '@/features/brief/types';
import { timeToMinutes } from '@/features/tasks/scheduleUtils';
import type { DayPlanItem } from '@/features/tasks/types';

const RE_SWEEP_MS = 2 * 60 * 1000;

const DONE_HINT =
  /\b(merged|approved|sent|shipped|cleared|done|completed|resolved|closed|launched)\b/i;

function nowMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isSchedulePast(item: DayPlanItem, now = new Date()): boolean {
  const scheduled = timeToMinutes(item.time);
  if (scheduled === Number.MAX_SAFE_INTEGER) return false;
  return scheduled <= nowMinutes(now);
}

export function isMajorFocusBlock(item: DayPlanItem): boolean {
  return item.blockKind === 'major' && Boolean(item.focusId);
}

/**
 * Mock “check the apps” pass for a focus-linked major block.
 * Uses briefing signals + focus copy as stand-ins for live integrations.
 */
export function sweepLinkedFocus(
  focus: FocusItem | undefined,
  briefing: BriefingSignal[],
): { done: boolean; note: string } {
  if (!focus) {
    return { done: true, note: 'No linked focus — crossed out.' };
  }

  const related = briefing.filter((signal) => signal.platform === focus.platform);
  const corpus = [
    focus.title,
    focus.reason,
    focus.aiRecommendation,
    ...related.map((s) => `${s.title} ${s.summary}`),
  ].join(' ');

  const done = DONE_HINT.test(corpus) || focus.priority === 'low';

  if (done) {
    return {
      done: true,
      note: `Chief checked ${labelForPlatform(focus.platform)} — marked done.`,
    };
  }

  return {
    done: false,
    note: `Chief checked ${labelForPlatform(focus.platform)} — still open.`,
  };
}

function labelForPlatform(platform: FocusItem['platform']): string {
  switch (platform) {
    case 'gmail':
      return 'Gmail';
    case 'calendar':
      return 'Calendar';
    case 'slack':
      return 'Slack';
    case 'github':
      return 'GitHub';
    case 'notion':
      return 'Notion';
    case 'asana':
      return 'Asana';
    case 'trello':
      return 'Trello';
    default:
      return 'apps';
  }
}

/**
 * When a schedule’s time passes:
 * - normal blocks → crossed out (completed)
 * - major + focus → AI app sweep; cross only if the linked task looks done
 */
export function applyDueScheduleLogic(
  items: DayPlanItem[],
  focusItems: FocusItem[],
  briefing: BriefingSignal[],
  now = new Date(),
): DayPlanItem[] {
  const focusById = new Map(focusItems.map((item) => [item.id, item]));
  const nowMs = now.getTime();
  let changed = false;

  const next = items.map((item) => {
    if (item.status === 'completed') return item;
    if (!isSchedulePast(item, now)) return item;

    // Normal blocks: cross out immediately — no app sweep
    if (!isMajorFocusBlock(item)) {
      changed = true;
      return {
        ...item,
        status: 'completed' as const,
        sweepPhase: 'none' as const,
      };
    }

    // Major focus blocks: re-sweep periodically while still open
    const recentlySwept =
      typeof item.lastSweepAt === 'number' && nowMs - item.lastSweepAt < RE_SWEEP_MS;

    if (item.sweepPhase === 'still_open' && recentlySwept) {
      return item;
    }

    const focus = item.focusId ? focusById.get(item.focusId) : undefined;
    const result = sweepLinkedFocus(focus, briefing);

    changed = true;
    if (result.done) {
      return {
        ...item,
        status: 'completed' as const,
        sweepPhase: 'cleared' as const,
        lastSweepAt: nowMs,
        subtitle: result.note,
      };
    }

    return {
      ...item,
      status: 'in_progress' as const,
      sweepPhase: 'still_open' as const,
      lastSweepAt: nowMs,
      subtitle: result.note,
    };
  });

  return changed ? next : items;
}

/** Match a schedule title to a top Focus item for major-block linking. */
export function matchFocusForTitle(
  title: string,
  focusItems: FocusItem[],
): FocusItem | undefined {
  const needle = title.trim().toLowerCase();
  if (!needle) return undefined;

  const highFirst = [...focusItems].sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority];
  });

  return highFirst.find((focus) => {
    const hay = focus.title.toLowerCase();
    return hay.includes(needle) || needle.includes(hay) || shareToken(needle, hay);
  });
}

function shareToken(a: string, b: string): boolean {
  const tokens = a.split(/\s+/).filter((t) => t.length > 3);
  return tokens.some((token) => b.includes(token));
}
