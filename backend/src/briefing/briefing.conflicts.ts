/**
 * Derived Focus helpers — calendar/alerts surface only as relations to real work,
 * never as raw dumps of every event or login notice.
 */

const FLEXIBLE_BLOCK =
  /\b(gym|workout|exercise|personal|errand|lunch|coffee|focus time|hold|blocked|busy|run|yoga|pilates|walk|self[- ]?care|haircut|chores)\b/i;

const TIGHT_PRIORITY =
  /\b(deadline|due today|due soon|overdue|asap|urgent|submit|ship today|due by)\b/i;

const STOP_TOKENS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'to',
  'for',
  'of',
  'in',
  'on',
  'at',
  'is',
  'are',
  'your',
  'you',
  'from',
  'with',
  'this',
  'that',
  'was',
  'were',
  'have',
  'has',
  'new',
  'please',
  'email',
  'mail',
  'http',
  'https',
  'www',
  'com',
]);

export type CalendarBlock = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
};

export type PriorityRef = {
  id: string;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  urgencyLabel: string;
  relevance: number;
  platform?: string;
};

export type SchedulePriorityConflict = {
  block: CalendarBlock;
  priority: PriorityRef;
};

export type RelatedAlertMatch = {
  alertId: string;
  priority: PriorityRef;
  overlapTokens: string[];
};

/** Personal / flexible calendar time that can yield to tight work. */
export function isProtectableCalendarBlock(block: CalendarBlock): boolean {
  const title = block.title.trim() || 'Calendar block';
  if (FLEXIBLE_BLOCK.test(title)) return true;
  const durationMs = Math.max(0, block.endsAt.getTime() - block.startsAt.getTime());
  // Long non-named holds still compete with deadlines.
  if (durationMs >= 60 * 60 * 1000 && !/\b(interview|customer|client|board|all[- ]?hands)\b/i.test(title)) {
    return true;
  }
  return false;
}

export function isTightPriority(priority: PriorityRef): boolean {
  if (priority.priority === 'high') return true;
  if (priority.relevance >= 0.72) return true;
  const blob = `${priority.urgencyLabel} ${priority.title} ${priority.reason}`;
  return TIGHT_PRIORITY.test(blob);
}

/**
 * Compare today's calendar blocks with Top Priorities.
 * Returns pairs where a protectable block should be rescheduled / shortened.
 */
export function findSchedulePriorityConflicts(
  blocks: CalendarBlock[],
  priorities: PriorityRef[],
  now = new Date(),
): SchedulePriorityConflict[] {
  const dayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const todayBlocks = blocks.filter(
    (block) =>
      block.startsAt.getTime() >= dayStart.getTime() &&
      block.startsAt.getTime() < dayEnd.getTime() &&
      isProtectableCalendarBlock(block),
  );
  const tight = priorities.filter(isTightPriority).slice(0, 6);
  if (todayBlocks.length === 0 || tight.length === 0) return [];

  const out: SchedulePriorityConflict[] = [];
  const usedPriorities = new Set<string>();

  for (const block of todayBlocks) {
    const priority =
      tight.find((item) => !usedPriorities.has(item.id)) ?? tight[0];
    if (!priority) continue;
    usedPriorities.add(priority.id);
    out.push({ block, priority });
    if (out.length >= 2) break;
  }

  return out;
}

/** Significant tokens for relating alerts to priorities. */
export function significantTokens(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9@.\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^@+|@+$/g, ''))
    .filter((t) => t.length >= 4 && !STOP_TOKENS.has(t));
  return new Set(tokens);
}

/**
 * True when an alert shares meaningful tokens with a Top Priority
 * (brand, product, project name) — not merely "payment" / "login".
 * Payment/billing alerts must share the vendor brand (e.g. Vercel↔Vercel),
 * never a generic verb like "update" that can hitch to unrelated work.
 */
export function findRelatedPriority(
  alert: {
    title: string;
    snippet?: string | null;
    bodyText?: string | null;
    fromAddress?: string | null;
  },
  priorities: PriorityRef[],
): RelatedAlertMatch | null {
  const alertBlob = `${alert.title} ${alert.snippet ?? ''} ${alert.bodyText ?? ''} ${alert.fromAddress ?? ''}`;
  const alertTokens = significantTokens(alertBlob);
  const fromDomain = (alert.fromAddress ?? '')
    .toLowerCase()
    .split('@')[1]
    ?.split('.')[0];
  // Ignore mega-provider domains — "google" must not link a login alert to work.
  const ignoreDomains = new Set([
    'google',
    'gmail',
    'apple',
    'icloud',
    'microsoft',
    'outlook',
    'live',
    'yahoo',
    'github',
    'amazon',
    'facebook',
    'meta',
    'accounts',
  ]);
  if (fromDomain && fromDomain.length >= 4 && !ignoreDomains.has(fromDomain)) {
    alertTokens.add(fromDomain);
  }
  // Drop generic alert vocabulary so "payment" / "update" alone never matches.
  for (const generic of [
    'payment',
    'invoice',
    'billing',
    'receipt',
    'security',
    'device',
    'login',
    'signin',
    'sign-in',
    'account',
    'verify',
    'alert',
    'failed',
    'failure',
    'unsuccessful',
    'unrecognized',
    'unrecognised',
    'charge',
    'noreply',
    'support',
    'google',
    'apple',
    'microsoft',
    'gmail',
    'icloud',
    'outlook',
    'signed',
    'chrome',
    'safari',
    'firefox',
    'update',
    'latest',
    'check',
    'required',
    'action',
    'method',
    'card',
    'credit',
    'debit',
    'amount',
    'dollars',
    'please',
  ]) {
    alertTokens.delete(generic);
  }
  if (alertTokens.size === 0 || priorities.length === 0) return null;

  const paymentLike =
    /\b(payment|invoice|billing|charge|declined|past due|subscription)\b/i.test(
      alertBlob,
    ) || Boolean(fromDomain && !ignoreDomains.has(fromDomain));

  // Billing vendors must appear on the priority (Vercel payment ≠ Railway update).
  let candidates = priorities;
  if (paymentLike && fromDomain && !ignoreDomains.has(fromDomain)) {
    const branded = priorities.filter((priority) => {
      const blob = `${priority.title} ${priority.reason} ${priority.platform ?? ''}`.toLowerCase();
      const tokens = significantTokens(blob);
      return tokens.has(fromDomain) || blob.includes(fromDomain);
    });
    if (branded.length === 0) return null;
    candidates = branded;
  }

  let best: RelatedAlertMatch | null = null;
  let bestScore = 0;

  for (const priority of candidates) {
    const priorityTokens = significantTokens(
      `${priority.title} ${priority.reason} ${priority.platform ?? ''}`,
    );
    const overlap: string[] = [];
    for (const token of alertTokens) {
      if (priorityTokens.has(token)) overlap.push(token);
    }
    // Require 2+ tokens, or one strong brand (≥6) that isn't a weak verb.
    const strong = overlap.filter((t) => t.length >= 6);
    if (overlap.length < 2 && strong.length === 0) continue;
    if (overlap.length === 1 && strong.length === 1 && paymentLike) {
      // Single brand token OK only when it is the vendor domain.
      if (fromDomain && strong[0] !== fromDomain && !strong[0].includes(fromDomain)) {
        continue;
      }
    }
    const score =
      overlap.length +
      strong.length * 0.5 +
      (fromDomain && overlap.includes(fromDomain) ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = {
        alertId: '',
        priority,
        overlapTokens: overlap,
      };
    }
  }

  return best;
}
