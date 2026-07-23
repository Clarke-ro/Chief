import type { WorkspaceContextPayload } from '../context/workspace-context.types';
import type { WorkspaceKnowledge } from '../knowledge/knowledge.types';

/** Compact meta about the unified workspace understanding. */
export type WorkspaceUnderstandingSummary = {
  focusCount: number;
  meetingCount: number;
  openDeadlineCount: number;
  unreadEmailCount: number;
  openTaskCount: number;
  successLabel?: string;
};

/**
 * Unified understanding for Ask Chief — context payload the model already knows
 * plus knowledge snapshot and a small summary.
 */
export type WorkspaceUnderstanding = {
  workspaceId: string;
  context: WorkspaceContextPayload;
  knowledge: WorkspaceKnowledge;
  understanding: WorkspaceUnderstandingSummary;
};
