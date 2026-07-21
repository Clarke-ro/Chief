/**
 * Internal relevance scoring + presentation helpers for Workspace Engine.
 * Not exposed in the UI — drives Brief, Top Priority, and action labels.
 */

export type ScoredText = {
  subject?: string | null;
  snippet?: string | null;
  bodyText?: string | null;
  fromAddress?: string | null;
  fromName?: string | null;
  labelIds?: string[] | null;
};

/** Work categories for Brief grouping (Chief-of-Staff framing). */
export type BriefSection =
  | 'Needs Attention'
  | 'Security'
  | 'Career'
  | 'Finance'
  | 'Meetings'
  | 'Projects'
  | 'Updates';

export type WorkKind =
  | 'deadline'
  | 'meeting'
  | 'invoice'
  | 'email'
  | 'security'
  | 'document'
  | 'career'
  | 'approval'
  | 'task';

const PROMO_LABELS = new Set([
  'CATEGORY_PROMOTIONS',
  'CATEGORY_SOCIAL',
  'CATEGORY_FORUMS',
]);

const PROMO_PATTERNS =
  /\b(unsubscribe|newsletter|promo(tion)?s?|% off|sale|deal|discount|free shipping|limited time|click here|noreply|no-reply|marketing|digest|weekly roundup|xiaomi|maths?\s*tutor|tutoring|win a |giveaway|coupon)\b/i;

const HIGH_VALUE_PATTERNS =
  /\b(deadline|due\s*(by|on|date)?|hackathon|build\s*week|interview|invoice|payment|payroll|billing|approve|approval|action\s*required|security|password|verify|2fa|mfa|urgent|asap|rsvp|meeting|standup|demo|proposal|contract|offer\s*letter|wire|receipt|refund|tax|irs|bank|statement|purchase\s*order|po\s*#|pull\s*request|code\s*review|ship|launch|milestone|assessment|coding\s*challenge)\b/i;

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

export function classifyWorkKind(input: {
  kind: 'email' | 'event' | 'task';
  title: string;
  snippet?: string | null;
  bodyText?: string | null;
}): WorkKind {
  const blob = `${input.title} ${input.snippet ?? ''} ${input.bodyText ?? ''}`;

  if (input.kind === 'event') return 'meeting';
  if (/\b(security|password|verify|2fa|mfa|new device|login alert|suspicious)\b/i.test(blob)) {
    return 'security';
  }
  if (/\b(invoice|payment|payroll|billing|receipt|refund|wire|purchase order)\b/i.test(blob)) {
    return 'invoice';
  }
  if (/\b(interview|assessment|coding challenge|offer letter|job application)\b/i.test(blob)) {
    return 'career';
  }
  if (/\b(deadline|due|hackathon|build week|submit by)\b/i.test(blob)) {
    return 'deadline';
  }
  if (/\b(approve|approval|sign off|signature required)\b/i.test(blob)) {
    return 'approval';
  }
  if (/\b(proposal|document|deck|spec|contract|pdf)\b/i.test(blob)) {
    return 'document';
  }
  if (input.kind === 'task') return 'task';
  return 'email';
}

export function briefSectionFor(kind: WorkKind): BriefSection {
  switch (kind) {
    case 'security':
      return 'Security';
    case 'career':
      return 'Career';
    case 'invoice':
    case 'approval':
      return 'Finance';
    case 'meeting':
      return 'Meetings';
    case 'deadline':
      return 'Needs Attention';
    case 'document':
    case 'task':
      return 'Projects';
    default:
      return 'Updates';
  }
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
  if (from && !from.includes('notification') && !from.includes('alert@')) {
    score += 0.05;
  }
  if (/\b(openai|devpost|github|stripe|linear|notion|figma|aws|google|apple)\b/i.test(blob)) {
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

/** Outcome-first Top Priority title — what to do, not what arrived. */
export function toActionableTitle(input: {
  kind: 'email' | 'event' | 'task';
  title: string;
  fromName?: string | null;
  startsAt?: Date | null;
  snippet?: string | null;
}): string {
  const raw = stripReFwd(input.title.trim() || 'Untitled');
  const blob = `${raw} ${input.snippet ?? ''}`;
  const work = classifyWorkKind({
    kind: input.kind,
    title: raw,
    snippet: input.snippet,
  });

  if (input.kind === 'task') {
    if (ACTION_VERBS.test(raw)) return truncate(raw, 72);
    return truncate(`Complete: ${raw}`, 72);
  }

  if (input.kind === 'event' || work === 'meeting') {
    const when = input.startsAt
      ? input.startsAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : null;
    const clean = raw.replace(/^(meeting|sync|call):\s*/i, '').trim() || raw;
    return truncate(when ? `Prepare for ${when} meeting — ${clean}` : `Prepare for ${clean}`, 72);
  }

  if (/\bbuild\s*week\b/i.test(blob) || /\bhackathon\b/i.test(blob)) {
    const project = raw
      .replace(/\b(hackathon|build week|deadline|due|reminder)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return truncate(`Submit ${project || 'Build Week project'}`, 72);
  }

  if (work === 'invoice' || /\bbilling\b/i.test(blob)) {
    const who =
      input.fromName?.replace(/\s*(inc|llc|ltd|billing|noreply).*$/i, '').trim() ||
      extractEntity(raw) ||
      'billing';
    return truncate(`Resolve ${who} billing issue`, 72);
  }

  if (work === 'security') {
    return truncate('Review security alert', 72);
  }

  if (work === 'career') {
    if (/\binterview\b/i.test(blob)) {
      return truncate(`Prepare for interview — ${raw}`, 72);
    }
    return truncate(`Complete assessment — ${raw}`, 72);
  }

  if (work === 'approval') {
    return truncate(`Approve: ${raw}`, 72);
  }

  if (work === 'deadline') {
    return truncate(`Submit: ${raw}`, 72);
  }

  if (work === 'document') {
    return truncate(`Review: ${raw}`, 72);
  }

  const from = input.fromName?.trim();
  if (from) {
    return truncate(`Respond to ${from}`, 72);
  }
  return truncate(`Follow up: ${raw}`, 72);
}

/** Supporting line under the title — deadline / stakes / effort, not “thread from…”. */
export function buildActionReason(input: {
  workKind: WorkKind;
  title: string;
  snippet?: string | null;
  fromName?: string | null;
  dueAt?: Date | null;
  startsAt?: Date | null;
  estimatedTime: string;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const parts: string[] = [];

  if (input.dueAt) {
    parts.push(`Deadline: ${formatRelativeDeadline(input.dueAt, now)}`);
  } else if (input.startsAt) {
    parts.push(`When: ${formatRelativeDeadline(input.startsAt, now)}`);
  } else if (input.workKind === 'deadline') {
    parts.push(inferDeadlineHint(input.title, input.snippet) ?? 'Time-sensitive');
  } else if (input.workKind === 'invoice') {
    parts.push('Payment may be required to avoid interruption');
  } else if (input.workKind === 'security') {
    parts.push('Confirm this was you');
  } else if (input.workKind === 'meeting') {
    parts.push('Walk in prepared');
  } else if (input.snippet?.trim()) {
    parts.push(truncate(input.snippet.trim(), 64));
  } else if (input.fromName) {
    parts.push(`From ${input.fromName}`);
  }

  parts.push(`Est. ${input.estimatedTime}`);
  return parts.join(' · ');
}

/** Primary open/handoff label — next logical step, not generic “Open”. */
export function contextualOpenLabel(workKind: WorkKind): string {
  switch (workKind) {
    case 'deadline':
      return 'View timeline';
    case 'meeting':
      return 'Prepare';
    case 'invoice':
      return 'Pay';
    case 'email':
      return 'Reply';
    case 'security':
      return 'Review';
    case 'document':
      return 'Open document';
    case 'career':
      return 'View details';
    case 'approval':
      return 'Review request';
    case 'task':
      return 'Start';
    default:
      return 'Continue';
  }
}

export function estimatedMinutesFor(workKind: WorkKind): string {
  switch (workKind) {
    case 'meeting':
      return '15 min';
    case 'deadline':
      return '20 min';
    case 'invoice':
    case 'security':
      return '5 min';
    case 'approval':
      return '10 min';
    case 'career':
      return '25 min';
    case 'document':
      return '15 min';
    default:
      return '10 min';
  }
}

function extractEntity(subject: string): string | null {
  const cleaned = stripReFwd(subject)
    .replace(/\b(invoice|payment|billing|receipt|issue|alert)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 2) return null;
  return cleaned.split(/[-–|:]/)[0]?.trim() || cleaned;
}

function inferDeadlineHint(title: string, snippet?: string | null): string | null {
  const blob = `${title} ${snippet ?? ''}`;
  if (/\btomorrow\b/i.test(blob)) return 'Deadline: Tomorrow';
  if (/\btoday\b/i.test(blob)) return 'Deadline: Today';
  if (/\bthis week\b/i.test(blob)) return 'Deadline: This week';
  return null;
}

function formatRelativeDeadline(date: Date, now: Date): string {
  const startOfDay = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dayDiff = Math.round(
    (startOfDay(date) - startOfDay(now)) / (24 * 60 * 60 * 1000),
  );
  if (dayDiff < 0) return 'Overdue';
  if (dayDiff === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  if (dayDiff === 1) return 'Tomorrow';
  if (dayDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

/** Preferred Brief section order for scanning. */
export const BRIEF_SECTION_ORDER: BriefSection[] = [
  'Needs Attention',
  'Security',
  'Finance',
  'Career',
  'Meetings',
  'Projects',
  'Updates',
];
