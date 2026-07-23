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
  | 'Calendar'
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

/** Informational alerts — Brief-ok, rarely Focus. */
const NOISE_ALERT_PATTERNS =
  /\b(new device|unrecognised device|unrecognized (device|login|sign[- ]?in)|login alert|sign[- ]?in (from|alert|detected)|we (noticed|detected) a (new|sign)|security alert|verify it('s| was) you|was this you)\b/i;

const ACTIONABLE_SECURITY =
  /\b(unauthorized|account (locked|compromised|suspended)|reset your password|password reset required|suspicious (activity|attempt)|enable 2fa|mfa required|take action|secure your account)\b/i;

const ACTIONABLE_PAYMENT =
  /\b(payment failed|failed (charge|payment)|declined|past due|overdue (invoice|payment)|update (your )?(payment|card|billing)|insufficient funds|action required.*(pay|payment|card))\b/i;

const MEETING_LIKE =
  /\b(meeting|standup|stand-up|1:1|1\-1|sync|call|interview|demo|zoom|google meet|teams|huddle|retro|planning)\b/i;

const NON_MEETING_CALENDAR =
  /\b(focus time|hold|blocked|busy|ooo|out of office|travel|flight|doctor|dentist|appointment|holiday|pto|vacation|birthday|reminder)\b/i;

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

  if (input.kind === 'event') {
    // Calendar blocks are not automatically "meetings".
    if (NON_MEETING_CALENDAR.test(blob)) return 'task';
    if (MEETING_LIKE.test(blob)) return 'meeting';
    return 'meeting';
  }
  if (
    /\b(security|password|verify|verification|2fa|mfa|new device|login alert|sign[- ]?in|unrecognized|unrecognised|suspicious|oauth|authorization|unauthorized access)\b/i.test(
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
      return 'Calendar';
    case 'deadline':
      return 'Needs Attention';
    case 'document':
    case 'task':
      return 'Projects';
    default:
      return 'Updates';
  }
}

/**
 * Top Priorities must be actionable work ("do something").
 * Calendar / security / payment never enter Focus directly — only via
 * conflict or related-priority synthesis in BriefingService.
 */
export function isFocusEligible(input: {
  workKind: WorkKind;
  title: string;
  snippet?: string | null;
  bodyText?: string | null;
  source: 'email' | 'event' | 'task';
}): boolean {
  const blob = `${input.title} ${input.snippet ?? ''} ${input.bodyText ?? ''}`;

  if (input.source === 'event') return false;

  switch (input.workKind) {
    case 'meeting':
    case 'security':
    case 'invoice':
      return false;
    case 'deadline':
    case 'approval':
    case 'document':
    case 'task':
    case 'career':
      return true;
    case 'email':
      return (
        ACTION_VERBS.test(blob) ||
        /\b(reply|respond|please\s+(review|confirm|send|submit)|action required|needs? your)\b/i.test(
          blob,
        )
      );
    default:
      return true;
  }
}

/** Hold security / payment / login alerts until related to Top Priorities. */
export function shouldDeferAlertSurfacing(
  workKind: WorkKind,
  title: string,
  snippet?: string | null,
  bodyText?: string | null,
): boolean {
  if (workKind === 'security' || workKind === 'invoice') return true;
  const blob = `${title} ${snippet ?? ''} ${bodyText ?? ''}`;
  return NOISE_ALERT_PATTERNS.test(blob);
}

export function scoreEmail(input: ScoredText & { isUnread?: boolean; receivedAt?: Date | null }): number {
  if (isLowValueMail(input)) return 0.08;

  let score = 0.35;
  const blob = `${input.subject ?? ''} ${input.snippet ?? ''} ${input.bodyText ?? ''}`.slice(
    0,
    4000,
  );

  const informationalAlert =
    NOISE_ALERT_PATTERNS.test(blob) && !ACTIONABLE_SECURITY.test(blob);
  const actionableSecurity = ACTIONABLE_SECURITY.test(blob);
  const actionablePayment = ACTIONABLE_PAYMENT.test(blob);

  if (actionableSecurity || actionablePayment) score += 0.34;
  else if (informationalAlert) score += 0.12;
  else if (HIGH_VALUE_PATTERNS.test(blob)) score += 0.28;

  if (ACTION_VERBS.test(blob)) score += 0.1;
  if (input.isUnread) score += 0.06;

  const from = (input.fromAddress ?? '').toLowerCase();
  if (from && !from.includes('notification') && !from.includes('alert@')) {
    score += 0.05;
  }
  if (
    !informationalAlert &&
    /\b(openai|devpost|github|stripe|linear|notion|figma|aws|google|apple)\b/i.test(blob)
  ) {
    score += 0.1;
  }

  if (input.receivedAt) {
    const ageH = (Date.now() - input.receivedAt.getTime()) / 3_600_000;
    if (ageH < 24) score += 0.06;
    else if (ageH < 72) score += 0.03;
  }

  // Informational login/device alerts stay Brief-tier, not Focus-tier by score alone.
  if (informationalAlert) {
    score = Math.min(score, 0.55);
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
  // Base stays below Focus threshold — calendar lives on Schedule / light Brief.
  let score = 0.38;
  if (hoursUntil >= -1 && hoursUntil <= 4) score += 0.2;
  else if (hoursUntil > 4 && hoursUntil <= 24) score += 0.14;
  else if (hoursUntil > 24 && hoursUntil <= 72) score += 0.06;
  else if (hoursUntil < -1) score -= 0.2;

  const blob = `${input.title} ${input.description ?? ''}`;
  if (MEETING_LIKE.test(blob)) score += 0.06;
  if (NON_MEETING_CALENDAR.test(blob)) score -= 0.08;
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

export type FocusNarrative = {
  headline: string;
  workKind: WorkKind;
  /** Compact Focus subtitle (ellipsis-friendly). */
  reasonHint: string;
  /** Brief expand bullets — Chief-written, never raw email lines. */
  briefBullets: string;
  /** Focus detail: what this is about. */
  aboutTitle: string;
  aboutBody: string;
  /** Focus detail: what the user should do. */
  actionTitle: string;
  actionBody: string;
  recommendation: string;
};

/**
 * Synthesize Chief-of-Staff copy from workspace signals.
 * Imperative headlines + narrative sections — never dump email body text.
 */
export function synthesizeWorkCopy(input: SynthesisInput): {
  headline: string;
  detail: string;
  workKind: WorkKind;
} {
  const narrative = synthesizeFocusNarrative(input);
  return {
    headline: narrative.headline,
    detail: narrative.aboutBody,
    workKind: narrative.workKind,
  };
}

/** Full Focus + Brief narrative for one workspace signal. */
export function synthesizeFocusNarrative(input: SynthesisInput): FocusNarrative {
  const now = input.now ?? new Date();
  const raw = stripReFwd(input.title.trim() || 'Untitled');
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
  const facts = extractSignalFacts(blob);
  const deadlineHint = input.dueAt
    ? formatRelativeDeadline(input.dueAt, now)
    : inferDeadlineHint(raw, input.snippet) || facts.relativeDeadline;

  let headline: string;
  let aboutTitle: string;
  let aboutBody: string;
  let actionTitle: string;
  let actionBody: string;
  let recommendation: string;
  let reasonHint: string;
  const bullets: string[] = [];

  if (input.kind === 'task') {
    headline = ACTION_VERBS.test(raw) ? raw : `Complete ${topic}`;
    aboutTitle = 'On your task list';
    aboutBody = input.dueAt
      ? `This is actionable work due ${formatRelativeDeadline(input.dueAt, now)}. Clearing it keeps the rest of your day from stacking up.`
      : 'This is actionable work on your list that deserves a focused block today.';
    actionTitle = 'What to do';
    actionBody = 'Open the task, finish the next concrete step, then mark it done in Chief.';
    recommendation = 'Start this in your next focused block.';
    reasonHint = input.dueAt
      ? `Deadline: ${formatRelativeDeadline(input.dueAt, now)}`
      : 'Actionable today';
    bullets.push('Finish the next concrete step on this task');
    bullets.push('Mark it done once the outcome is clear');
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
    aboutTitle = 'Upcoming meeting';
    aboutBody = when
      ? `You have “${clean}” at ${when}. Showing up prepared protects the agenda and follow-ups.`
      : `You have “${clean}” coming up. Showing up prepared protects the agenda and follow-ups.`;
    actionTitle = 'How to prepare';
    actionBody =
      'Skim related notes, list 2–3 outcomes you want, and arrive with one clear ask.';
    recommendation = 'Block 10–15 minutes before it starts for prep.';
    reasonHint = when ? `When: ${when}` : 'Walk in prepared';
    bullets.push(when ? `Meeting starts at ${when}` : 'Meeting is on your calendar');
    bullets.push('List 2–3 outcomes before you join');
    if (facts.location) bullets.push(`Location: ${facts.location}`);
  } else if (/\bbuild\s*week\b/i.test(blob) || /\bhackathon\b/i.test(blob) || /\bdevpost\b/i.test(blob)) {
    headline = deadlineHint
      ? `Submit your Build Week project before the deadline ${deadlineHint === 'Today' ? 'today' : deadlineHint}`
      : 'Submit your Build Week project before the deadline';
    aboutTitle = 'Build Week deadline';
    aboutBody =
      'Your OpenAI / Devpost Build Week submission is time-sensitive. Late uploads risk missing judging or demo slots.';
    actionTitle = 'Submission checklist';
    actionBody =
      'Confirm the project runs as required, share anything reviewers need, and upload demo materials early to avoid rendering delays.';
    recommendation = 'Ship the submission first, then polish secondary assets.';
    reasonHint = deadlineHint ? `Deadline: ${deadlineHint}` : 'Time-sensitive';
    bullets.push('Confirm the build runs against the required models');
    bullets.push('Share the private repo with the reviewers listed in the brief');
    bullets.push('Upload the architecture demo early to avoid render delays');
  } else if (workKind === 'invoice' || /\b(billing|payment|subscription|charge|wallet|top[- ]?up)\b/i.test(blob)) {
    const payee = brand || 'this subscription';
    const amount = facts.amount;
    if (/\b(top[- ]?up|wallet|balance)\b/i.test(blob)) {
      headline = `Top up your ${payee} wallet so the recurring charge can clear`;
      aboutTitle = 'Wallet balance warning';
      aboutBody = amount
        ? `${payee} needs enough balance to cover a ${amount} charge. Running low can suspend the card or fail renewals.`
        : `${payee} is warning that your wallet balance may not cover the next charge.`;
      actionTitle = 'What to do';
      actionBody = 'Top up the wallet now and confirm the baseline balance stays above the minimum.';
      recommendation = 'Fund the wallet before the next billing attempt.';
      reasonHint = amount ? `${amount} due` : 'Top-up needed';
      bullets.push(amount ? `Cover the ${amount} recurring charge` : 'Cover the upcoming recurring charge');
      bullets.push('Keep balance above the stated minimum to avoid suspension');
    } else if (
      /\b(failed|declined|couldn't|could not|update.*(card|payment)|payment method|billing problem)\b/i.test(
        blob,
      )
    ) {
      headline = `Update your payment method for ${payee} to resolve the billing problem`;
      aboutTitle = 'Failed payment';
      aboutBody = amount
        ? `${payee} could not collect ${amount}. Until this is fixed, the subscription can lapse or features can lock.`
        : `${payee} reported a billing problem with your payment method.`;
      actionTitle = 'Fix billing';
      actionBody =
        'Update the card on file, retry the charge, and confirm the account shows active again.';
      recommendation = 'Resolve billing before the grace window closes.';
      reasonHint = 'Payment required';
      bullets.push(amount ? `Failed charge: ${amount}` : 'A recurring charge failed');
      bullets.push(`Update the payment method for ${payee}`);
      bullets.push('Confirm the subscription is active after retry');
    } else {
      headline = `Resolve the ${payee} billing issue before service is interrupted`;
      aboutTitle = 'Billing needs attention';
      aboutBody = `${payee} sent a billing notice that needs a decision — pay, update method, or dispute.`;
      actionTitle = 'What to do';
      actionBody = 'Verify the amount, settle or escalate if it looks wrong, then confirm status.';
      recommendation = 'Clear billing today so service is not interrupted.';
      reasonHint = 'Billing issue';
      bullets.push(`Review the ${payee} billing notice`);
      bullets.push(amount ? `Confirm the ${amount} charge` : 'Confirm the charged amount');
      bullets.push('Pay, update method, or escalate');
    }
  } else if (workKind === 'security') {
    const place = facts.place;
    const account = brand || 'your account';
    if (/\b(oauth|third[- ]party|authorization|authori[sz]e)\b/i.test(blob)) {
      headline = `Verify the authorization of the third-party app on ${account}`;
      aboutTitle = 'New app authorization';
      aboutBody = `${account} reports a third-party OAuth authorization. If you did not approve it, treat it as unauthorized access.`;
      actionTitle = 'Verify access';
      actionBody =
        'Open the security settings, confirm the app name, and revoke access if it looks unfamiliar.';
      recommendation = 'Revoke first if anything looks off — you can re-authorize later.';
      reasonHint = 'Security';
      bullets.push(`Third-party access was requested on ${account}`);
      bullets.push('Confirm you intended this authorization');
      bullets.push('Revoke immediately if the app is unfamiliar');
    } else {
      headline = place
        ? `Review unrecognized access on ${account} from ${place}`
        : `Review the security alert on ${account}`;
      aboutTitle = 'Security alert';
      aboutBody = place
        ? `${account} flagged unrecognized access from ${place}. Confirm it was you before leaving the session open.`
        : `${account} flagged a security event that needs your confirmation.`;
      actionTitle = 'Secure the account';
      actionBody =
        'Confirm the login if it was you. If not, revoke the session, reset the password, and review connected devices.';
      recommendation = 'Treat unknown logins as urgent — revoke first, investigate second.';
      reasonHint = 'Confirm this was you';
      bullets.push(place ? `Unrecognized access from ${place}` : 'Unrecognized access was detected');
      bullets.push('Confirm it was you or revoke the session');
      bullets.push('Reset credentials if the activity was not yours');
    }
  } else if (workKind === 'career') {
    const org = brand || 'the recruitment team';
    if (/\binterview\b/i.test(blob)) {
      headline = `Prepare for your interview with ${org}`;
      aboutTitle = 'Interview coming up';
      aboutBody = `${org} moved your application to an interview stage. Prep now while context is fresh.`;
      actionTitle = 'How to prepare';
      actionBody =
        'Review the role requirements, prep 2–3 examples, and confirm logistics for the interview.';
      recommendation = 'Block prep time on your calendar today.';
      reasonHint = 'Career';
      bullets.push(`Interview step with ${org}`);
      bullets.push('Review role requirements and prep examples');
      bullets.push('Confirm time and format');
    } else if (/\b(receipt|received|confirmed|missing)\b/i.test(blob)) {
      headline = `${org} confirmed receipt — track next steps on your application`;
      aboutTitle = 'Application update';
      aboutBody = `${org} acknowledged materials on your application. The next signal is usually assessment results or a follow-up ask.`;
      actionTitle = 'Stay ready';
      actionBody =
        'Watch for results or requests, and complete any optional survey so the loop stays warm.';
      recommendation = 'No panic move — just keep the thread monitored.';
      reasonHint = 'Career update';
      bullets.push(`${org} confirmed receipt of your materials`);
      bullets.push('Watch for assessment results or follow-up asks');
      if (/\bsurvey\b/i.test(blob)) bullets.push('Optional survey is available if you want to close the loop');
    } else {
      headline = `Complete the assessment or application step for ${org}`;
      aboutTitle = 'Career next step';
      aboutBody = `${org} has an open assessment or application step that still needs your attention.`;
      actionTitle = 'What to do';
      actionBody =
        'Open the prompt, schedule focused time, and submit while momentum is high.';
      recommendation = 'Finish the assessment in one sitting if possible.';
      reasonHint = 'Career';
      bullets.push(`Open assessment / application step with ${org}`);
      bullets.push('Schedule focused time to complete it');
      bullets.push('Submit before the window closes');
    }
  } else if (workKind === 'approval') {
    headline = brand
      ? `Review and approve the request from ${brand}`
      : `Review and approve: ${topic}`;
    aboutTitle = 'Approval needed';
    aboutBody = brand
      ? `${brand} is blocked until you approve or request changes.`
      : 'Someone is waiting on your approval before they can move forward.';
    actionTitle = 'Make the call';
    actionBody = 'Review the ask, approve or request changes, then reply so others unblock.';
    recommendation = 'Decide in one pass — approve, change request, or delegate.';
    reasonHint = 'Waiting on your decision';
    bullets.push(brand ? `Approval requested by ${brand}` : 'An approval is waiting on you');
    bullets.push('Approve, request changes, or delegate');
    bullets.push('Reply once so the thread is unblocked');
  } else if (workKind === 'deadline') {
    headline = deadlineHint
      ? `Finish “${topic}” — due ${deadlineHint}`
      : `Finish “${topic}” before the deadline`;
    aboutTitle = 'Deadline approaching';
    aboutBody = deadlineHint
      ? `“${topic}” is due ${deadlineHint}. Waiting burns the remaining runway.`
      : `“${topic}” is time-sensitive and still open.`;
    actionTitle = 'Close the loop';
    actionBody =
      'Confirm the deliverable, block time now, and submit before the cutoff.';
    recommendation = 'Protect a focused block today for this deliverable.';
    reasonHint = deadlineHint ? `Deadline: ${deadlineHint}` : 'Time-sensitive';
    bullets.push(deadlineHint ? `Due ${deadlineHint}` : 'Deadline is approaching');
    bullets.push('Confirm the exact deliverable');
    bullets.push('Block time and submit before cutoff');
  } else if (workKind === 'document') {
    headline = `Review “${topic}” and leave clear decisions`;
    aboutTitle = 'Document review';
    aboutBody = `A document or proposal (“${topic}”) needs your read and a clear decision.`;
    actionTitle = 'Review path';
    actionBody =
      'Scan for asks that need your call, leave comments, then reply once with the decision.';
    recommendation = 'Leave decisions in-line so the owner can proceed.';
    reasonHint = 'Review needed';
    bullets.push(`Review “${topic}”`);
    bullets.push('Leave comments on open questions');
    bullets.push('Send one clear decision reply');
  } else if (/\b(delet(?:e|ion)|permanent|scheduled.*remov)/i.test(blob)) {
    headline = brand
      ? `Cancel the scheduled deletion on ${brand} if this was unintended`
      : `Cancel the scheduled deletion if this was unintended — ${topic}`;
    aboutTitle = 'Scheduled deletion';
    aboutBody = brand
      ? `${brand} queued a deletion. If that was unintended, you still have a short window to reverse it.`
      : 'A deletion was scheduled. If unintended, reverse it before the window closes.';
    actionTitle = 'Reverse if needed';
    actionBody =
      'Open the project page, cancel the deletion queue, and confirm resources are still active.';
    recommendation = 'Act before the retention window expires.';
    reasonHint = 'Time-sensitive';
    bullets.push('A deletion was scheduled');
    bullets.push('Cancel it if this was unintended');
    bullets.push('Confirm resources remain active');
  } else {
    const crafted = craftGenericHeadline({ topic, brand, who, raw, blob });
    headline = crafted.headline;
    aboutTitle = crafted.aboutTitle;
    aboutBody = crafted.aboutBody;
    actionTitle = crafted.actionTitle;
    actionBody = crafted.actionBody;
    recommendation = crafted.recommendation;
    reasonHint = crafted.reasonHint;
    bullets.push(...crafted.bullets);
  }

  while (bullets.length < 2) {
    bullets.push('Decide the next step, then clear it from your plate');
  }

  return {
    headline: truncate(collapseWhitespace(headline), 140),
    workKind,
    reasonHint: truncate(collapseWhitespace(reasonHint), 48),
    briefBullets: bullets
      .slice(0, 4)
      .map((line) => `• ${truncate(collapseWhitespace(line), 110)}`)
      .join('\n'),
    aboutTitle,
    aboutBody: truncate(collapseWhitespace(aboutBody), 280),
    actionTitle,
    actionBody: truncate(collapseWhitespace(actionBody), 280),
    recommendation: truncate(collapseWhitespace(recommendation), 160),
  };
}

/** @deprecated Prefer synthesizeFocusNarrative / synthesizeBriefBullets. */
export function summarizeBodyAsBriefList(
  _bodyText?: string | null,
  _snippet?: string | null,
  fallback?: string | null,
): string {
  if (fallback?.includes('•')) return fallback;
  return synthesizeFocusNarrative({
    kind: 'email',
    title: fallback || 'Update',
  }).briefBullets;
}

export function synthesizeBriefBullets(input: SynthesisInput): string {
  return synthesizeFocusNarrative(input).briefBullets;
}

function craftGenericHeadline(input: {
  topic: string;
  brand: string | null;
  who: string | null;
  raw: string;
  blob: string;
}): {
  headline: string;
  aboutTitle: string;
  aboutBody: string;
  actionTitle: string;
  actionBody: string;
  recommendation: string;
  reasonHint: string;
  bullets: string[];
} {
  const { topic, brand, who, raw, blob } = input;
  const actor = brand || who;

  if (ACTION_VERBS.test(raw)) {
    return {
      headline: topic,
      aboutTitle: 'Needs your attention',
      aboutBody: actor
        ? `${actor} surfaced “${topic}”. It already reads like an action — confirm the outcome and close it.`
        : `“${topic}” already reads like an action. Confirm the outcome and close it.`,
      actionTitle: 'What to do',
      actionBody: 'Take the next concrete step, then mark it done so it leaves your plate.',
      recommendation: 'Finish the obvious next step in one pass.',
      reasonHint: 'Actionable',
      bullets: [
        `Carry out: ${topic}`,
        actor ? `From ${actor}` : 'Confirm the expected outcome',
        'Mark done when finished',
      ],
    };
  }

  if (/\b(new leads?|available|opportunity|opportunities)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Review new opportunities from ${actor}`
        : `Review new opportunities — ${topic}`,
      aboutTitle: 'New opportunities',
      aboutBody: actor
        ? `${actor} shared new leads or opportunities. Decide which are worth pursuing before they go stale.`
        : 'New leads or opportunities arrived. Decide which are worth pursuing before they go stale.',
      actionTitle: 'Triage',
      actionBody: 'Skim the list, shortlist what fits, and reply or dismiss the rest.',
      recommendation: 'Triage quickly — pursue, defer, or dismiss.',
      reasonHint: 'Review leads',
      bullets: [
        actor ? `New opportunities from ${actor}` : 'New opportunities arrived',
        'Shortlist what is worth pursuing',
        'Reply or dismiss the rest',
      ],
    };
  }

  if (/\b(confirm(?:ed|ation)?|received|receipt|acknowledged)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Note the confirmation from ${actor} and track any follow-ups`
        : `Note the confirmation on “${topic}” and track follow-ups`,
      aboutTitle: 'Confirmation received',
      aboutBody: actor
        ? `${actor} confirmed something on “${topic}”. No crisis — just keep an eye on follow-ups.`
        : `A confirmation landed on “${topic}”. Watch for any follow-up ask.`,
      actionTitle: 'Light touch',
      actionBody: 'File it mentally, check whether a reply is needed, otherwise let it ride.',
      recommendation: 'Only act if a next step is explicitly requested.',
      reasonHint: 'FYI',
      bullets: [
        actor ? `Confirmation from ${actor}` : 'Confirmation received',
        'Check whether a reply is required',
        'Track any follow-up ask',
      ],
    };
  }

  if (/\b(reminder|don't forget|do not forget|action required|important)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Act on the reminder from ${actor}: ${topic}`
        : `Act on this reminder: ${topic}`,
      aboutTitle: 'Reminder',
      aboutBody: actor
        ? `${actor} sent a reminder about “${topic}”. Handle it before it slips again.`
        : `A reminder about “${topic}” is still open.`,
      actionTitle: 'Clear the reminder',
      actionBody: 'Do the asked step in your next open block, then confirm it is done.',
      recommendation: 'Handle this before picking up new work.',
      reasonHint: 'Reminder',
      bullets: [
        actor ? `Reminder from ${actor}` : 'Open reminder',
        `About: ${topic}`,
        'Complete it in your next open block',
      ],
    };
  }

  if (/\b(update|updated|changelog|released|shipped)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Check the latest update from ${actor}`
        : `Check the latest update on “${topic}”`,
      aboutTitle: 'Status update',
      aboutBody: actor
        ? `${actor} published an update on “${topic}”. Skim for anything that changes your plan.`
        : `There is an update on “${topic}” that may change your plan.`,
      actionTitle: 'Skim for impact',
      actionBody: 'Check whether you need to reply, adjust priorities, or simply acknowledge.',
      recommendation: 'Skim once; only escalate if it blocks you.',
      reasonHint: 'Update',
      bullets: [
        actor ? `Update from ${actor}` : 'New update available',
        'Skim for anything that changes your plan',
        'Reply only if an ask is present',
      ],
    };
  }

  if (/\b(invite|invitation|rsvp|join|register)\b/i.test(blob)) {
    return {
      headline: actor
        ? `Decide on the invite from ${actor}`
        : `Decide on this invite: ${topic}`,
      aboutTitle: 'Invitation',
      aboutBody: actor
        ? `${actor} invited you to “${topic}”. Accept, decline, or propose another time.`
        : `You were invited to “${topic}”. Accept, decline, or propose another time.`,
      actionTitle: 'RSVP',
      actionBody: 'Check your calendar, decide, and respond so the organizer can plan.',
      recommendation: 'RSVP today while the slot is still open.',
      reasonHint: 'RSVP',
      bullets: [
        actor ? `Invite from ${actor}` : 'Open invitation',
        `About: ${topic}`,
        'Accept, decline, or propose a new time',
      ],
    };
  }

  if (
    /\b(\?|can you|could you|please (reply|respond|confirm|send)|looking for your|need your)\b/i.test(
      blob,
    )
  ) {
    return {
      headline: actor ? `Reply to ${actor} about ${topic}` : `Reply about ${topic}`,
      aboutTitle: 'Someone is waiting',
      aboutBody: actor
        ? `${actor} is waiting on an answer about “${topic}”.`
        : `Someone is waiting on an answer about “${topic}”.`,
      actionTitle: 'Reply path',
      actionBody: 'Reply, schedule a time, or delegate — then clear the open loop.',
      recommendation: 'Answer in one short message if you can.',
      reasonHint: 'Reply needed',
      bullets: [
        actor ? `${actor} asked about “${topic}”` : `A reply is needed on “${topic}”`,
        'Reply, schedule, or delegate',
        'Clear the open loop afterward',
      ],
    };
  }

  if (/\b(report|criteria|assignment|project report|evaluation)\b/i.test(blob)) {
    return {
      headline: `Prepare “${topic}” and review the evaluation criteria`,
      aboutTitle: 'Academic / project work',
      aboutBody: `“${topic}” needs preparation against evaluation criteria before you submit.`,
      actionTitle: 'Prep the deliverable',
      actionBody: 'Outline the report, review criteria, and block time to draft.',
      recommendation: 'Start with criteria so the draft hits the rubric.',
      reasonHint: 'Prep needed',
      bullets: [
        `Prepare “${topic}”`,
        'Review evaluation criteria',
        'Block time to draft and submit',
      ],
    };
  }

  return {
    headline: actor
      ? `Review “${topic}” from ${actor} and decide the next step`
      : `Review “${topic}” and decide the next step`,
    aboutTitle: 'Needs a decision',
    aboutBody: actor
      ? `${actor} sent “${topic}”. Decide whether this is reply, schedule, or done.`
      : `“${topic}” needs a decision: reply, schedule, or clear.`,
    actionTitle: 'What to do',
    actionBody: 'Skim for the ask, choose the next step, and close the loop.',
    recommendation: 'One decision clears this from Top Priority.',
    reasonHint: 'Decide next step',
    bullets: [
      actor ? `From ${actor}: “${topic}”` : `About “${topic}”`,
      'Identify the ask',
      'Reply, schedule, or mark done',
    ],
  };
}

function extractSignalFacts(blob: string): {
  amount: string | null;
  place: string | null;
  location: string | null;
  relativeDeadline: string | null;
} {
  const amount =
    blob.match(/\$\s?\d+(?:,\d{3})*(?:\.\d{2})?(?:\s*(?:USD|usd))?/)?.[0]?.replace(/\s+/g, '') ??
    null;
  const place =
    blob.match(
      /\b(?:from|in)\s+([A-Z][a-zA-Z]+(?:,\s*[A-Z][a-zA-Z]+)?)/,
    )?.[1] ?? null;
  const location =
    blob.match(/\b(?:at|location[:\s]+)([A-Za-z0-9 .,'-]{3,40})/i)?.[1]?.trim() ?? null;
  return {
    amount,
    place,
    location,
    relativeDeadline: inferDeadlineHint(blob, null),
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

/** Compact Focus subtitle — one ellipsis-friendly line, not a body dump. */
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
  const narrative = synthesizeFocusNarrative({
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

  return truncate(
    collapseWhitespace([narrative.reasonHint, `Est. ${input.estimatedTime}`].filter(Boolean).join(' · ')),
    88,
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
  'Calendar',
  'Projects',
  'Updates',
];
