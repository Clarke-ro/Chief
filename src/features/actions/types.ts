import type { PlatformIconId } from '@/components/ui';

/** Work Chief can finish inside the app (editable artifact). */
export type CanvasKind = 'email' | 'message' | 'notes' | 'schedule';

/**
 * Work that must finish in another app (merge PR, open GitHub, etc.).
 * Chief prepares context, then hands off in one tap.
 */
export type HandoffTarget = PlatformIconId | 'generic';

export type ActionExecution = 'canvas' | 'handoff';

/** A one-tap actionable item attached to a Chief reply (or Home/Focus). */
export type ActionableTask = {
  id: string;
  label: string;
  execution: ActionExecution;
  /** Short description shown on the card */
  summary?: string;
  canvasKind?: CanvasKind;
  handoffTarget?: HandoffTarget;
  /** Subject / title for canvas drafts */
  title?: string;
  /** Body Chief prepared */
  draft?: string;
  /** Deep link or web URL for handoff */
  url?: string;
  /** Optional recipient / channel label */
  recipient?: string;
  /** Extra context line under the title */
  context?: string;
};

export type CanvasRouteParams = {
  taskId: string;
  label?: string;
  canvasKind?: string;
  title?: string;
  draft?: string;
  recipient?: string;
  context?: string;
  handoffUrl?: string;
  handoffTarget?: string;
};
