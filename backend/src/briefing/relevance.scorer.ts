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
  if (
    /\b(security|password|verify|verification|2fa|mfa|new device|login alert|sign[- ]?in|unrecognized|suspicious|oauth|authorization|unauthorized access)\b/i.test(
      blob,
    )
  ) {
    return 'security';
  }
  if (
    /\b(invoice|payment|payroll|billing|receipt|refund|wire|purchase order|subscription|failed charge|payment method|top up|wallet)\b/i.test(
      blob,
    )
  ) {
    return 'invoice';
  }
  if (
    /\b(interview|assessment|coding challenge|offer letter|job application|internship|recruitment|immersion)\b/i.test(
      blob,
    )
  ) {
    return 'career';
  }
  if (
    /\b(deadline|due\s*(by|on|date)?|hackathon|build\s*week|submit by|due today|due tomorrow)\b/i.test(
      blob,
    )
  ) {
    return 'deadline';
  }
  if (/\b(approve|approval|sign off|signature required|needs your approval)\b/i.test(blob)) {
    return 'approval';
  }
  if (/\b(proposal|document|deck|spec|contract|\.pdf|roadmap|pull request|PR #\d+)\b/i.test(blob)) {
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

type SynthesisInput = {
  kind: 'email' | 'event' | 'task';
  title: string;
  fromName?: string | null;
  startsAt?: Date | null;
  dueAt?: Date | null;
  snippet?: string | null;
  bodyText?: string | null;
  now?: Date;
};

/**
 * Synthesize Chief-of-Staff copy from workspace signals.
 * Imperative, specific, and outcome-led — never a raw subject dump
 * and never a blanket “Respond to…” wrapper.
 */
export function synthesizeWorkCopy(input: SynthesisInput): {
  headline: string;
  detail: string;
  workKind: WorkKind;
} {
  const now = input.now ?? new Date();
  const raw = stripReFwd(input.title.trim() || 'Untitled');
  const detailSource = cleanDetailText(input.bodyText || input.snippet || '');
  const blob = `${raw} ${input.snippet ?? ''} ${input.bodyText ?? ''}`;
  const workKind = classifyWorkKind({
    kind: input.kind,
    title: raw,
    snippet: input.snippet,
    bodyText: input.bodyText,
  });
  const who = cleanSenderName(input.fromName);
  const brand = extractBrand(blob) || who;
  const topic = shortSubject(raw);
  const deadlineHint = input.dueAt
    ? formatRelativeDeadline(input.dueAt, now)
    : inferDeadlineHint(raw, input.snippet);

  let headline: string;
  let detail: string;

  if (input.kind === 'task') {
    headline = ACTION_VERBS.test(raw) ? raw : `Complete ${topic}`;
    detail =
      detailSource ||
      (input.dueAt
        ? `Due ${formatRelativeDeadline(input.dueAt, now)} — finish this before it blocks the rest of your day.`
        : 'Move this forward in your next focused block.');
  } else if (input.kind === 'event' || workKind === 'meeting') {
    const when = input.startsAt
      ? input.startsAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : null;
    const clean = raw.replace(/^(meeting|sync|call):\s*/i, '').trim() || raw;
    headline = when
      ? `Prepare for your ${when} meeting — ${clean}`
      : `Prepare for ${clean}`;
    detail =
      detailSource ||
      'Skim notes and list 2–3 outcomes so you walk in ready to decide.';
  } else if (/\bbuild\s*week\b/i.test(blob) || /\bhackathon\b/i.test(blob) || /\bdevpost\b/i.test(blob)) {
    headline = deadlineHint
      ? `Submit your Build Week project before the deadline ${deadlineHint === 'Today' ? 'today' : deadlineHint}`
      : 'Submit your Build Week project before the deadline';
    detail =
      detailSource ||
      'Confirm submission requirements, share anything reviewers need, and upload demo materials early.';
  } else if (workKind === 'invoice' || /\b(billing|payment|subscription|charge|wallet|top[- ]?up)\b/i.test(blob)) {
    const payee = brand || 'this subscription';
    if (/\b(top[- ]?up|wallet|balance)\b/i.test(blob)) {
      headline = `Top up your ${payee} wallet so the recurring charge can clear`;
      detail =
        detailSource ||
        'Keep enough balance to avoid card suspension or failed renewals.';
    } else if (
      /\b(failed|declined|couldn't|could not|update.*(card|payment)|payment method|billing problem)\b/i.test(
        blob,
      )
    ) {
      headline = `Update your payment method for ${payee} to resolve the billing problem`;
      detail =
        detailSource ||
        'Fix the failed charge promptly to avoid interruption or account limits.';
    } else {
      headline = `Resolve the ${payee} billing issue before service is interrupted`;
      detail =
        detailSource ||
        'Verify the amount and settle or escalate if the charge looks wrong.';
    }
  } else if (workKind === 'security') {
    const place = blob.match(
      /\b(?:from|in)\s+([A-Z][a-zA-Z]+(?:,\s*[A-Z][a-zA-Z]+)?)/,
    )?.[1];
    const account = brand || 'your account';
    if (/\b(oauth|third[- ]party|authorization|authori[sz]e)\b/i.test(blob)) {
      headline = `Verify the authorization of the third-party app on ${account}`;
      detail =
        detailSource ||
        'Confirm you intended this access — revoke it if the app looks unfamiliar.';
    } else if (place) {
      headline = `Review unrecognized access on ${account} from ${place}`;
      detail =
        detailSource ||
        'Confirm this was you — if not, revoke the session and reset credentials immediately.';
    } else {
      headline = `Review the security alert on ${account}`;
      detail =
        detailSource ||
        'Confirm this was you — if not, revoke the session and reset credentials immediately.';
    }
  } else if (workKind === 'career') {
    const org = brand || 'the recruitment team';
    if (/\binterview\b/i.test(blob)) {
      headline = `Prepare for your interview with ${org}`;
      detail =
        detailSource ||
        'Review the role requirements and block prep time before the conversation.';
    } else if (/\b(receipt|received|confirmed|missing)\b/i.test(blob)) {
      headline = `${org} confirmed receipt — track next steps on your application`;
      detail =
        detailSource ||
        'Watch for assessment results or follow-up requests so nothing stalls.';
    } else if (/\b(survey|feedback)\b/i.test(blob)) {
      headline = `Complete the optional assessment survey from ${org}`;
      detail = detailSource || 'A short survey helps close the loop on your application experience.';
    } else {
      headline = `Complete the assessment or application step for ${org}`;
      detail =
        detailSource ||
        'Review requirements and schedule focused time to finish while momentum is high.';
    }
  } else if (workKind === 'approval') {
    headline = brand
      ? `Review and approve the request from ${brand}`
      : `Review and approve: ${topic}`;
    detail =
      detailSource ||
      'Decide approve / request changes, then reply so others are not blocked.';
  } else if (workKind === 'deadline') {
    headline = deadlineHint
      ? `Finish “${topic}” — due ${deadlineHint}`
      : `Finish “${topic}” before the deadline`;
    detail =
      detailSource ||
      'Confirm the deliverable and block time now while you still have runway.';
  } else if (workKind === 'document') {
    headline = `Review “${topic}” and leave clear decisions`;
    detail =
      detailSource ||
      'Scan for asks that need your call, then comment or reply once.';
  } else if (/\b(delet(?:e|ion)|permanent|scheduled.*remov)/i.test(blob)) {
    headline = brand
      ? `Cancel the scheduled deletion on ${brand} if this was unintended`
      : `Cancel the scheduled deletion if this was unintended — ${topic}`;
    detail =
      detailSource ||
      'Log in and reverse the queue before the retention window closes.';
  } else {
    // Generic mail: pick a verb from content — never default everything to “Respond to”.
    const crafted = craftGenericHeadline({
      topic,
      brand,
      who,
      raw,
      blob,
      detailSource,
    });
    headline = crafted.headline;
    detail = crafted.detail;
  }

  return {
    headline: truncate(collapseWhitespace(headline), 140),
    detail: truncate(collapseWhitespace(detail), 220),
    workKind,
  };
}

function craftGenericHeadline(input: {
  topic: string;
  brand: string | null;
  who: string | null;
  raw: string;
  blob: string;
  detailSource: string;
}): { headline: string; detail: string } {
  const { topic, brand, who, raw, blob, detailSource } = input;
  const actor = brand || who;

  // Subject already imperative — keep it, lightly cleaned.
  if (ACTION_VERBS.test(raw)) {
    return {
      headline: topic,
      detail:
        detailSource ||
        (actor
          ? `From ${actor} — take the next step and clear it.`
          : 'Take the next step and clear it from your plate.'),
    };
  }

  if (/\b(new leads?|available|opportunity|opportunities)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Review new opportunities from ${actor}`
        : `Review new opportunities — ${topic}`,
      detail: detailSource || 'Decide which leads are worth pursuing, then reply or dismiss.',
    };
  }

  if (/\b(confirm(?:ed|ation)?|received|receipt|acknowledged)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Note the confirmation from ${actor} and track any follow-ups`
        : `Note the confirmation on “${topic}” and track follow-ups`,
      detail: detailSource || 'No urgent action unless a next step is requested.',
    };
  }

  if (/\b(reminder|don't forget|do not forget|action required|important)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Act on the reminder from ${actor}: ${topic}`
        : `Act on this reminder: ${topic}`,
      detail: detailSource || 'Handle it in your next open block so it does not slip.',
    };
  }

  if (/\b(update|updated|changelog|released|shipped)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Check the latest update from ${actor}`
        : `Check the latest update on “${topic}”`,
      detail: detailSource || 'Skim for anything that changes your plan or needs a reply.',
    };
  }

  if (/\b(invite|invitation|rsvp|join|register)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Decide on the invite from ${actor}`
        : `Decide on this invite: ${topic}`,
      detail: detailSource || 'Accept, decline, or propose a new time — then move on.',
    };
  }

  if (
    /\b(\?|can you|could you|please (reply|respond|confirm|send)|looking for your|need your)\b/i.test(
      blob,
    )
  ) {
    return {
      headline: actor
        ? `Reply to ${actor} about ${topic}`
        : `Reply about ${topic}`,
      detail:
        detailSource ||
        'They are waiting on an answer — reply, schedule, or delegate.',
    };
  }

  if (/\b(report|criteria|assignment|project report|evaluation)\b/i.test(blob)) {
    return {
      headline: `Prepare “${topic}” and review the evaluation criteria`,
      detail: detailSource || 'Outline the deliverable and confirm what reviewers expect.',
    };
  }

  // Prefer outcome language over “Respond to {sender}”.
  if (actor) {
    return {
      headline: `Review “${topic}” from ${actor} and decide the next step`,
      detail:
        detailSource ||
        'Skim for asks, then reply, schedule, or mark done.',
    };
  }

  return {
    headline: `Review “${topic}” and decide the next step`,
    detail:
      detailSource ||
      'Turn this into a clear action so it does not linger as an open loop.',
  };
}

/** @deprecated Prefer synthesizeWorkCopy — kept for call sites that only need a headline. */
export function toActionableTitle(input: {
  kind: 'email' | 'event' | 'task';
  title: string;
  fromName?: string | null;
  startsAt?: Date | null;
  snippet?: string | null;
  bodyText?: string | null;
}): string {
  return synthesizeWorkCopy(input).headline;
}

/** Supporting line under the title — stakes and next step, not “thread from…”. */
export function buildActionReason(input: {
  workKind: WorkKind;
  title: string;
  snippet?: string | null;
  bodyText?: string | null;
  fromName?: string | null;
  dueAt?: Date | null;
  startsAt?: Date | null;
  estimatedTime: string;
  now?: Date;
}): string {
  const synthesized = synthesizeWorkCopy({
    kind:
      input.workKind === 'meeting'
        ? 'event'
        : input.workKind === 'task'
          ? 'task'
          : 'email',
    title: input.title,
    fromName: input.fromName,
    startsAt: input.startsAt,
    dueAt: input.dueAt,
    snippet: input.snippet,
    bodyText: input.bodyText,
    now: input.now,
  });

  const now = input.now ?? new Date();
  const timing = input.dueAt
    ? `Deadline: ${formatRelativeDeadline(input.dueAt, now)}`
    : input.startsAt
      ? `When: ${formatRelativeDeadline(input.startsAt, now)}`
      : null;

  return collapseWhitespace(
    [timing, synthesized.detail, `Est. ${input.estimatedTime}`].filter(Boolean).join(' · '),
  );
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
    .replace(/\b(invoice|payment|billing|receipt|issue|alert|subscription)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 2) return null;
  return cleaned.split(/[-–|:]/)[0]?.trim() || cleaned;
}

function cleanSenderName(name?: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/\s*(inc|llc|ltd|billing|noreply|no-reply|notifications?)\b.*$/i, '')
    .replace(/via\s+.+$/i, '')
    .trim();
  return cleaned.length >= 2 ? cleaned : trimmed;
}

function extractBrand(blob: string): string | null {
  const known =
    blob.match(
      /\b(Apple|Google|GitHub|Notion|OpenAI|Devpost|Stripe|Railway|AmaliTech|Eversend|Microsoft|Slack|Linear|Figma|AWS|Kling|Instories)\b/i,
    )?.[1];
  return known ?? null;
}

function shortSubject(subject: string): string {
  const cleaned = stripReFwd(subject)
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= 48) return cleaned;
  return `${cleaned.slice(0, 47)}…`;
}

function cleanDetailText(value: string): string {
  const cleaned = collapseWhitespace(
    value
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\b(unsubscribe|view in browser|privacy policy)\b.*$/gim, '')
      .replace(/[<>]/g, ' '),
  );
  if (cleaned.length < 24) return '';
  return cleaned;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function inferDeadlineHint(title: string, snippet?: string | null): string | null {
  const blob = `${title} ${snippet ?? ''}`;
  if (/\btomorrow\b/i.test(blob)) return 'Tomorrow';
  if (/\btoday\b/i.test(blob)) return 'Today';
  if (/\bthis week\b/i.test(blob)) return 'This week';
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
