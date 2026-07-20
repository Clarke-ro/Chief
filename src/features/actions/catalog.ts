import { HANDOFF_URLS } from '@/config/handoffUrls';
import type { ActionableTask, CanvasKind, HandoffTarget } from '@/features/actions/types';

/** Default drafts Chief produces when starting canvas work. */
const CANVAS_DRAFTS: Record<
  CanvasKind,
  { title: string; draft: string; recipient?: string; summary: string }
> = {
  email: {
    title: 'Follow-up',
    recipient: 'investor@firm.com',
    summary: 'Chief drafts the reply — review, then open in Mail.',
    draft: `Hi,

Thanks for the note — happy to share a quick update.

We're on track for the customer demo this afternoon. PR #182 is the last blocker on the payment flow; once that lands, staging stays green and we ship.

Happy to jump on a call next week if useful.

Best,
Clark`,
  },
  message: {
    title: 'Team update',
    recipient: '#eng',
    summary: 'Chief drafts the message — review, then open in Slack.',
    draft: `Quick update: I'm clearing PR #182 now so the afternoon deploy can proceed. Maya / Jordan / Sam — you're unblocked once it merges. Ping me if anything else is holding the demo path.`,
  },
  notes: {
    title: 'Talking points',
    summary: 'Chief prepares talking points you can take into the meeting.',
    draft: `• Lead with traction: deploy cadence + today's customer demo
• Risk you're actively clearing: PR #182 (staging green, merge pending)
• Ask: partnership timeline and next diligence checkpoint
• Close with clear next step and owner`,
  },
  schedule: {
    title: 'Reschedule proposal',
    summary: 'Chief proposes a move — confirm, then open Calendar.',
    draft: `Move Sprint Planning from 10:00 AM → 3:30 PM today.

Reason: protects customer demo prep without slipping team alignment.

Attendees already free in the alternate slot.`,
  },
};

const HANDOFF_DEFAULTS: Record<
  string,
  { url: string; target: HandoffTarget; summary: string }
> = {
  github: {
    url: HANDOFF_URLS.github,
    target: 'github',
    summary: "Chief can't merge outside the app — open GitHub to finish.",
  },
  gmail: {
    url: HANDOFF_URLS.gmail,
    target: 'gmail',
    summary: 'Open Mail to send or edit further.',
  },
  slack: {
    url: HANDOFF_URLS.slack,
    target: 'slack',
    summary: 'Open Slack to post or finish the thread.',
  },
  calendar: {
    url: HANDOFF_URLS.calendar,
    target: 'calendar',
    summary: 'Open Calendar to confirm the change.',
  },
  notion: {
    url: HANDOFF_URLS.notion,
    target: 'notion',
    summary: 'Open Notion to continue editing.',
  },
};

function inferFromLabel(label: string): Partial<ActionableTask> {
  const lower = label.toLowerCase();

  if (lower.includes('draft') && (lower.includes('email') || lower.includes('reply') || lower.includes('update'))) {
    const kind: CanvasKind = lower.includes('slack') || lower.includes('message') ? 'message' : 'email';
    return { execution: 'canvas', canvasKind: kind, ...CANVAS_DRAFTS[kind] };
  }
  if (lower.includes('draft') && (lower.includes('talk') || lower.includes('status') || lower.includes('note'))) {
    return { execution: 'canvas', canvasKind: 'notes', ...CANVAS_DRAFTS.notes };
  }
  if (lower.includes('draft') && lower.includes('reply')) {
    return { execution: 'canvas', canvasKind: 'message', ...CANVAS_DRAFTS.message };
  }
  if (lower.includes('ping') || lower.includes('notify') || lower.includes('message')) {
    return { execution: 'canvas', canvasKind: 'message', ...CANVAS_DRAFTS.message };
  }
  if (lower.includes('reschedule') || lower.includes('schedule') || lower.includes('block focus') || lower.includes('find time')) {
    return { execution: 'canvas', canvasKind: 'schedule', ...CANVAS_DRAFTS.schedule };
  }
  if (lower.includes('github') || lower.includes('merge') || lower.includes('open pr') || lower.includes('open source')) {
    return {
      execution: 'handoff',
      handoffTarget: 'github',
      url: HANDOFF_URLS.github,
      summary: HANDOFF_DEFAULTS.github.summary,
    };
  }
  if (lower.includes('slack') || lower.includes('open slack')) {
    return {
      execution: 'handoff',
      handoffTarget: 'slack',
      url: HANDOFF_URLS.slack,
      summary: HANDOFF_DEFAULTS.slack.summary,
    };
  }
  if (lower.includes('deck') || lower.includes('notion') || lower.includes('metrics')) {
    return {
      execution: 'handoff',
      handoffTarget: 'notion',
      url: HANDOFF_URLS.notion,
      summary: HANDOFF_DEFAULTS.notion.summary,
    };
  }
  if (lower.includes('explain') || lower.includes('summarize') || lower.includes('summary')) {
    return {
      execution: 'canvas',
      canvasKind: 'notes',
      context: 'ask-chief',
      draft: lower.includes('summarize') || lower.includes('summary')
        ? `Summarize the key points and risks for: ${label}`
        : `Explain this and what I should do next: ${label}`,
      summary: 'Continue with Chief in chat.',
    };
  }

  if (lower.includes('send')) {
    return { execution: 'canvas', canvasKind: 'email', ...CANVAS_DRAFTS.email };
  }

  // Default: treat as in-app notes canvas so something always happens
  return { execution: 'canvas', canvasKind: 'notes', ...CANVAS_DRAFTS.notes };
}

/** Resolve a thin { id, label } chip into a full actionable task. */
export function resolveActionableTask(
  action: { id: string; label: string },
  overrides?: Partial<ActionableTask>,
): ActionableTask {
  const inferred = inferFromLabel(action.label);
  const canvasKind = (overrides?.canvasKind ?? inferred.canvasKind) as CanvasKind | undefined;
  const canvasDefaults = canvasKind ? CANVAS_DRAFTS[canvasKind] : undefined;

  return {
    id: action.id,
    label: action.label,
    execution: overrides?.execution ?? inferred.execution ?? 'canvas',
    summary: overrides?.summary ?? inferred.summary ?? canvasDefaults?.summary,
    canvasKind,
    handoffTarget: overrides?.handoffTarget ?? inferred.handoffTarget,
    title: overrides?.title ?? inferred.title ?? canvasDefaults?.title ?? action.label,
    draft: overrides?.draft ?? inferred.draft ?? canvasDefaults?.draft,
    url: overrides?.url ?? inferred.url,
    recipient: overrides?.recipient ?? inferred.recipient ?? canvasDefaults?.recipient,
    context: overrides?.context ?? inferred.context,
  };
}

/** Map Home/Focus action ids into actionable tasks. */
export function resolveFocusActionable(
  focusTitle: string,
  action: { id: string; label: string },
): ActionableTask {
  const id = action.id.toLowerCase();

  if (id.includes('ask') || id.includes('explain') || id.includes('summar')) {
    const draft = id.includes('summar')
      ? `Summarize the key points and risks for: ${focusTitle}`
      : id.includes('explain')
        ? `Explain this and what I should do next: ${focusTitle}`
        : `Help me with: ${focusTitle}`;
    return {
      id: action.id,
      label: action.label,
      execution: 'canvas',
      canvasKind: 'notes',
      title: focusTitle,
      summary: 'Continue with Chief in chat.',
      draft,
      context: 'ask-chief',
    };
  }

  if (id.includes('draft') || id.includes('send')) {
    return resolveActionableTask(action, {
      execution: 'canvas',
      canvasKind: 'email',
      title: `Re: ${focusTitle}`,
      context: focusTitle,
    });
  }

  if (id.includes('reschedule') || id.includes('find')) {
    return resolveActionableTask(action, {
      execution: 'canvas',
      canvasKind: 'schedule',
      title: focusTitle,
      context: focusTitle,
    });
  }

  if (id.includes('merge') || id.includes('open') || id.includes('pr')) {
    return resolveActionableTask(action, {
      execution: 'handoff',
      handoffTarget: 'github',
      url: HANDOFF_URLS.github,
      title: focusTitle,
      summary: "Chief can't merge PRs outside the app — open GitHub to finish.",
      context: focusTitle,
    });
  }

  if (id.includes('slack') || id.includes('decide')) {
    return resolveActionableTask(action, {
      execution: 'canvas',
      canvasKind: 'message',
      title: focusTitle,
      context: focusTitle,
    });
  }

  return resolveActionableTask(action, { context: focusTitle, title: focusTitle });
}

export function handoffLabel(target?: HandoffTarget): string {
  switch (target) {
    case 'github':
      return 'Open GitHub';
    case 'gmail':
      return 'Open Gmail';
    case 'slack':
      return 'Open Slack';
    case 'calendar':
      return 'Open Calendar';
    case 'notion':
      return 'Open Notion';
    default:
      return 'Continue';
  }
}

export function canvasKindLabel(kind?: CanvasKind): string {
  switch (kind) {
    case 'email':
      return 'Email draft';
    case 'message':
      return 'Message draft';
    case 'schedule':
      return 'Schedule change';
    case 'notes':
      return 'Notes';
    default:
      return 'Working draft';
  }
}

/** Short intro above a canvas artifact (not the full draft dump). */
export function buildCanvasIntro(task: ActionableTask): string {
  const kind = task.canvasKind ?? 'notes';
  if (kind === 'email') {
    return "Here's a draft ready for you — edit it directly in the canvas, then open Gmail when you're set.";
  }
  if (kind === 'message') {
    return "Here's a message draft — edit it in the canvas, then open Slack to post.";
  }
  if (kind === 'schedule') {
    return "Here's the schedule change I'd make — adjust it, then open Calendar to confirm.";
  }
  return "Here's what I put together — edit it below, then continue when you're ready.";
}

/** In-canvas CTA — opens the destination app (bottom-right of the artifact). */
export function canvasHandoffAction(task: ActionableTask): { id: string; label: string } {
  const kind = task.canvasKind ?? 'notes';
  if (kind === 'email' || task.handoffTarget === 'gmail') {
    return { id: `${task.id}-handoff`, label: 'Open Gmail' };
  }
  if (kind === 'message' || task.handoffTarget === 'slack') {
    return { id: `${task.id}-handoff`, label: 'Open Slack' };
  }
  if (kind === 'schedule' || task.handoffTarget === 'calendar') {
    return { id: `${task.id}-handoff`, label: 'Open Calendar' };
  }
  if (task.handoffTarget === 'notion' || kind === 'notes') {
    return { id: `${task.id}-handoff`, label: 'Open Notion' };
  }
  if (task.handoffTarget === 'github') {
    return { id: `${task.id}-handoff`, label: 'Open GitHub' };
  }
  return { id: `${task.id}-handoff`, label: handoffLabel(task.handoffTarget) };
}

/**
 * Related chat follow-ups after a canvas draft — rewrite / refine,
 * not another “Open Gmail” (that lives on the canvas itself).
 */
export function canvasRelatedActions(task: ActionableTask): { id: string; label: string }[] {
  const kind = task.canvasKind ?? 'notes';
  if (kind === 'email') {
    return [
      { id: `${task.id}-rewrite`, label: 'Rewrite this email' },
      { id: `${task.id}-shorter`, label: 'Make it shorter' },
    ];
  }
  if (kind === 'message') {
    return [
      { id: `${task.id}-rewrite`, label: 'Rewrite this message' },
      { id: `${task.id}-tone`, label: 'Make it more casual' },
    ];
  }
  if (kind === 'schedule') {
    return [{ id: `${task.id}-alts`, label: 'Suggest other times' }];
  }
  return [{ id: `${task.id}-rewrite`, label: 'Rewrite this' }];
}

