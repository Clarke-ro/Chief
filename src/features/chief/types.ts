import type { PlatformIconId } from '@/components/ui';
import type { ActionableTask } from '@/features/actions/types';

export type ConversationAction = {
  id: string;
  label: string;
};

export type ConversationTurn = {
  id: string;
  role: 'user' | 'chief';
  content: string;
  /** Short lead-in above actions, e.g. "Next steps" / "What would you like to do next?" */
  actionsLead?: string;
  /** Only when the reply has clear next actions — omit otherwise */
  actions?: ConversationAction[];
  /** Lightweight canvas artifact card rendered under Chief's intro */
  canvas?: ActionableTask;
  context?: PlatformIconId[];
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
  turns: ConversationTurn[];
};

/** Seed workspace for Chief chat history. */
export type ChiefWorkspace = {
  sessions: ChatSession[];
  activeSessionId: string;
};
