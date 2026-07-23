/**
 * Structured knowledge projected from synced provider rows.
 * Size-capped — never a full mailbox dump.
 */
export type KnowledgeMeeting = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
};

export type KnowledgeEmail = {
  id: string;
  subject: string;
  from?: string;
  snippet: string;
  receivedAt?: string;
  isUnread: boolean;
};

export type KnowledgeTask = {
  id: string;
  title: string;
  status: string;
  section: string;
  priority: string;
  dueAt?: string;
  dueLabel?: string;
  estimatedTime?: string;
};

export type KnowledgeItem = {
  id: string;
  title: string;
  summary?: string;
};

export type WorkspaceKnowledge = {
  workspaceId: string;
  asOf: string;
  meetings: KnowledgeMeeting[];
  recentEmails: KnowledgeEmail[];
  tasks: KnowledgeTask[];
  github: KnowledgeItem[];
  slack: KnowledgeItem[];
};
