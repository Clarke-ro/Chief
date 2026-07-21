import { resolveActionableTask, resolveFocusActionable } from '@/features/actions/catalog';
import { openCanvas, openHandoff, showUnavailableAction } from '@/features/actions/executors';
import type { ActionableTask, HandoffTarget } from '@/features/actions/types';
import { workspaceNav } from '@/services/workspaceNav';

type ActionChip = {
  id: string;
  label: string;
  execution?: 'ask_chief' | 'handoff';
  handoff?: {
    target: HandoffTarget;
    url: string;
    summary?: string;
  };
};

/**
 * Canonical action kinds the product understands.
 * Buttons never navigate or open panels directly — they dispatch one of these.
 */
export type ActionKind =
  | 'ask_chief'
  | 'draft_email'
  | 'send_reply'
  | 'draft_message'
  | 'merge_pr'
  | 'open_pr'
  | 'reschedule'
  | 'find_time'
  | 'explain'
  | 'summarize'
  | 'handoff'
  | 'canvas';

export type ActionSource =
  | 'home'
  | 'focus'
  | 'chief_chat'
  | 'chief_chip'
  | 'canvas'
  | 'schedule'
  | 'analytics'
  | 'profile'
  | 'system';

export type DispatchActionInput =
  | {
      kind: 'chip';
      action: ActionChip;
      source: ActionSource;
      /** When set, resolve as a Focus-scoped action */
      focusTitle?: string;
      embedInChat?: boolean;
    }
  | {
      kind: 'task';
      task: ActionableTask;
      source: ActionSource;
      embedInChat?: boolean;
    }
  | {
      kind: 'ask';
      prompt: string;
      source: ActionSource;
      focusId?: string;
    };

export type ActionDispatchResult =
  | { outcome: 'ask_chief' }
  | { outcome: 'handoff'; task: ActionableTask }
  | { outcome: 'unavailable'; task: ActionableTask }
  | { outcome: 'canvas_panel'; task: ActionableTask }
  | { outcome: 'canvas_embedded'; task: ActionableTask };

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** Infer product action kind from chip id + label (+ optional task). */
export function classifyAction(
  action: { id?: string; label?: string },
  task?: ActionableTask,
): ActionKind {
  const id = normalize(action.id ?? task?.id ?? '');
  const label = normalize(action.label ?? task?.label ?? '');
  const blob = `${id} ${label}`;

  // Explicit Focus handoff contract wins over label heuristics (Reply / Pay / Prepare).
  if (task?.execution === 'handoff') return 'handoff';

  if (
    task?.context === 'ask-chief' ||
    blob.includes('ask chief') ||
    blob.includes('ask-chief') ||
    id.endsWith('-ask') ||
    /(^|[\W_])ask([\W_]|$)/.test(id)
  ) {
    return 'ask_chief';
  }
  if (blob.includes('explain')) return 'explain';
  if (blob.includes('summarize') || blob.includes('summary')) return 'summarize';
  if (blob.includes('merge')) return 'merge_pr';
  if (blob.includes('open pr') || (blob.includes('open') && blob.includes('pr'))) {
    return 'open_pr';
  }
  if (blob.includes('find time')) return 'find_time';
  if (blob.includes('reschedule') || blob.includes('adjust schedule')) return 'reschedule';
  if (blob.includes('send reply') || (blob.includes('send') && blob.includes('reply'))) {
    return 'send_reply';
  }
  if (
    blob.includes('draft email') ||
    blob.includes('draft update') ||
    (blob.includes('draft') && (blob.includes('email') || blob.includes('reply')))
  ) {
    return 'draft_email';
  }
  if (
    blob.includes('draft') &&
    (blob.includes('message') || blob.includes('slack') || blob.includes('notify'))
  ) {
    return 'draft_message';
  }
  if (blob.includes('draft')) return 'draft_email';

  if (
    blob.includes('github') ||
    blob.includes('open slack') ||
    blob.includes('open gmail') ||
    blob.includes('open in gmail') ||
    blob.includes('open calendar') ||
    blob.includes('open in calendar') ||
    blob.includes('open notion') ||
    blob.includes('open deck')
  ) {
    return 'handoff';
  }

  return 'canvas';
}

function askPromptFor(task: ActionableTask, actionKind: ActionKind): string {
  if (task.draft?.trim() && (actionKind === 'ask_chief' || task.context === 'ask-chief')) {
    return task.draft.trim();
  }
  const subject = task.title ?? task.label;
  if (actionKind === 'explain') {
    return `Explain this and what I should do next: ${subject}`;
  }
  if (actionKind === 'summarize') {
    return `Summarize the key points and risks for: ${subject}`;
  }
  return `Help me with: ${subject}`;
}

function resolveTask(
  input: Extract<DispatchActionInput, { kind: 'chip' | 'task' }>,
): ActionableTask {
  if (input.kind === 'task') return input.task;
  if (input.focusTitle) {
    return resolveFocusActionable(input.focusTitle, input.action);
  }
  return resolveActionableTask(input.action);
}

/**
 * Application-wide action router.
 *
 * Button / chip → dispatchAction → ask Chief | canvas | external handoff
 * Screens never open panels or navigate for product actions ad hoc.
 */
export async function dispatchAction(input: DispatchActionInput): Promise<ActionDispatchResult> {
  if (input.kind === 'ask') {
    workspaceNav.askChief(input.prompt, { focusId: input.focusId });
    return { outcome: 'ask_chief' };
  }

  const task = resolveTask(input);
  if (task.execution === 'unavailable') {
    showUnavailableAction(task);
    return { outcome: 'unavailable', task };
  }

  const actionKind = classifyAction(
    input.kind === 'chip' ? input.action : { id: task.id, label: task.label },
    task,
  );

  // Conversational intents → Chief with injected context (never a detached panel)
  if (actionKind === 'ask_chief' || actionKind === 'explain' || actionKind === 'summarize') {
    workspaceNav.askChief(askPromptFor(task, actionKind));
    return { outcome: 'ask_chief' };
  }

  // External finish — only with an explicit handoff task (verified URL).
  if (actionKind === 'handoff' || actionKind === 'merge_pr' || actionKind === 'open_pr') {
    if (task.execution !== 'handoff' || !task.url?.trim()) {
      const blocked: ActionableTask = {
        ...task,
        execution: 'unavailable',
        summary:
          task.summary ??
          'Chief needs a verified source link before it can open this item.',
      };
      showUnavailableAction(blocked);
      return { outcome: 'unavailable', task: blocked };
    }
    await openHandoff(task);
    return { outcome: 'handoff', task };
  }

  // In-app canvas work
  const canvasTask: ActionableTask = {
    ...task,
    execution: 'canvas',
    canvasKind:
      task.canvasKind ??
      (actionKind === 'draft_message'
        ? 'message'
        : actionKind === 'reschedule' || actionKind === 'find_time'
          ? 'schedule'
          : actionKind === 'draft_email' || actionKind === 'send_reply'
            ? 'email'
            : (task.canvasKind ?? 'notes')),
  };

  const embed =
    input.embedInChat === true || input.source === 'chief_chat' || input.source === 'chief_chip';

  if (embed) {
    return { outcome: 'canvas_embedded', task: canvasTask };
  }

  openCanvas(canvasTask);
  return { outcome: 'canvas_panel', task: canvasTask };
}

/** Convenience: Focus / Home action chips */
export function dispatchFocusAction(
  focusTitle: string,
  action: ActionChip,
  source: ActionSource = 'focus',
) {
  return dispatchAction({
    kind: 'chip',
    action,
    focusTitle,
    source,
  });
}

/** Convenience: generic chat / UI chips */
export function dispatchChipAction(
  action: { id: string; label: string },
  source: ActionSource = 'system',
  options?: { embedInChat?: boolean },
) {
  return dispatchAction({
    kind: 'chip',
    action,
    source,
    embedInChat: options?.embedInChat,
  });
}
