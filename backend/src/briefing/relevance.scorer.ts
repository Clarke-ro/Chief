/**
 * Internal relevance scoring for Workspace Engine decisions.
 * Not exposed in the UI — drives Brief + Top Priority ranking.
 */

export type ScoredText = {
  subject?: string | null;
  snippet?: string | null;
  bodyText?: string | null;
  fromAddress?: string | null;
  fromName?: string | null;
  labelIds?: string[] | null;
};

const PROMO_LABELS = new Set([
  'CATEGORY_PROMOTIONS',
  'CATEGORY_SOCIAL',
  'CATEGORY_FORUMS',
]);

const PROMO_PATTERNS =
  /\b(unsubscribe|newsletter|promo(tion)?s?|% off|sale|deal|discount|free shipping|limited time|click here|noreply|no-reply|marketing|digest|weekly roundup|xiaomi|maths?\s*tutor|tutoring|win a |giveaway|coupon)\b/i;

const HIGH_VALUE_PATTERNS =
  /\b(deadline|due\s*(by|on|date)?|hackathon|build\s*week|interview|invoice|payment|payroll|approve|approval|action\s*required|security|password|verify|2fa|mfa|urgent|asap|rsvp|meeting|standup|demo|proposal|contract|offer\s*letter|wire|receipt|refund|tax|irs|bank|statement|purchase\s*order|po\s*#|pull\s*request|code\s*review|ship|launch|milestone)\b/i;

const ACTION_VERBS =
  /\b(submit|review|prepare|respond|reply|approve|confirm|schedule|send|finish|complete|fix|update|pay|sign)\b/i;

/** Hard-reject promotional / low-signal mail. */
export function isLowValueMail(input: ScoredText): boolean {
  const labels = input.labelIds ?? [];
  if (labels.some((l) => PROMO_LABELS.has(l))) return true;
  const blob = `${input.subject ?? ''} ${input.snippet ?? ''} ${input.fromAddress ?? ''}`;
  if (PROMO_PATTERNS.test(blob)) return true;
  const from = (input.fromAddress ?? '').toLowerCase();
  if (
    from.includes('noreply') ||
    from.includes('no-reply') ||
    from.includes('newsletter') ||
    from.includes('marketing@') ||
    from.includes('promo@')
  ) {
    return true;
  }
  return false;
}

export function scoreEmail(input: ScoredText & { isUnread?: boolean; receivedAt?: Date | null }): number {
  if (isLowValueMail(input)) return 0.08;

  let score = 0.35;
  const blob = `${input.subject ?? ''} ${input.snippet ?? ''} ${input.bodyText ?? ''}`.slice(
    0,
    4000,
  );

  if (HIGH_VALUE_PATTERNS.test(blob)) score += 0.32;
  if (ACTION_VERBS.test(blob)) score += 0.08;
  if (input.isUnread) score += 0.06;

  const from = (input.fromAddress ?? '').toLowerCase();
  // Prefer human senders over automated domains.
  if (from && !from.includes('notification') && !from.includes('alert@')) {
    score += 0.05;
  }
  if (/\b(openai|devpost|github|stripe|linear|notion|figma|aws|google)\b/i.test(blob)) {
    score += 0.1;
  }

  if (input.receivedAt) {
    const ageH = (Date.now() - input.receivedAt.getTime()) / 3_600_000;
    if (ageH < 24) score += 0.06;
    else if (ageH < 72) score += 0.03;
  }

  return clamp01(score);
}

export function scoreCalendarEvent(input: {
  title: string;
  description?: string | null;
  startsAt: Date;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const hoursUntil =
    (input.startsAt.getTime() - now.getTime()) / 3_600_000;
  let score = 0.5;
  if (hoursUntil >= -1 && hoursUntil <= 4) score += 0.35;
  else if (hoursUntil > 4 && hoursUntil <= 24) score += 0.25;
  else if (hoursUntil > 24 && hoursUntil <= 72) score += 0.12;
  else if (hoursUntil < -1) score -= 0.2;

  const blob = `${input.title} ${input.description ?? ''}`;
  if (HIGH_VALUE_PATTERNS.test(blob)) score += 0.1;
  if (/cancel|cancelled|out of office|ooo/i.test(blob)) score -= 0.3;

  return clamp01(score);
}

export function scoreTask(input: {
  title: string;
  description?: string | null;
  priority: 'high' | 'medium' | 'low';
  dueAt?: Date | null;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  let score =
    input.priority === 'high' ? 0.72 : input.priority === 'medium' ? 0.55 : 0.4;

  if (input.dueAt) {
    const hoursUntil =
      (input.dueAt.getTime() - now.getTime()) / 3_600_000;
    if (hoursUntil < 0) score += 0.25;
    else if (hoursUntil <= 24) score += 0.2;
    else if (hoursUntil <= 72) score += 0.1;
  }

  const blob = `${input.title} ${input.description ?? ''}`;
  if (HIGH_VALUE_PATTERNS.test(blob)) score += 0.1;
  if (ACTION_VERBS.test(input.title)) score += 0.05;

  return clamp01(score);
}

/** Turn a subject/event into an actionable Top Priority title. */
export function toActionableTitle(input: {
  kind: 'email' | 'event' | 'task';
  title: string;
  fromName?: string | null;
  startsAt?: Date | null;
}): string {
  const raw = input.title.trim() || 'Untitled';
  if (input.kind === 'task') {
    if (ACTION_VERBS.test(raw)) return truncate(raw, 72);
    return truncate(`Finish: ${raw}`, 72);
  }

  if (input.kind === 'event') {
    const when = input.startsAt
      ? input.startsAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : null;
    const clean = raw.replace(/^(meeting|sync|call):\s*/i, '').trim() || raw;
    return truncate(when ? `Prepare for ${when} — ${clean}` : `Prepare for ${clean}`, 72);
  }

  // email
  if (/\bdeadline\b/i.test(raw) || /\bdue\b/i.test(raw)) {
    return truncate(`Submit: ${stripReFwd(raw)}`, 72);
  }
  if (/\binvoice|payment|payroll|pay\b/i.test(raw)) {
    return truncate(`Handle payment: ${stripReFwd(raw)}`, 72);
  }
  if (/\bapprove|approval\b/i.test(raw)) {
    return truncate(`Approve: ${stripReFwd(raw)}`, 72);
  }
  if (/\binterview\b/i.test(raw)) {
    return truncate(`Prepare for interview: ${stripReFwd(raw)}`, 72);
  }
  if (/\bsecurity|password|verify|2fa\b/i.test(raw)) {
    return truncate(`Secure account: ${stripReFwd(raw)}`, 72);
  }
  const from = input.fromName?.trim();
  return truncate(
    from ? `Respond to ${from} — ${stripReFwd(raw)}` : `Respond: ${stripReFwd(raw)}`,
    72,
  );
}

function stripReFwd(subject: string): string {
  return subject.replace(/^(re|fw|fwd):\s*/gi, '').trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** Minimum scores for surfacing in Brief / Top Priority. */
export const RELEVANCE_THRESHOLDS = {
  focus: 0.48,
  briefing: 0.45,
} as const;
