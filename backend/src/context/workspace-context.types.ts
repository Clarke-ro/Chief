/**
 * Compact, model-ready workspace snapshot.
 * Never dump a full inbox — only ranked / recent / time-bounded items.
 */
export type WorkspaceContextPriority = {
  id: string;
  title: string;
  reason: string;
  priority: string;
  urgencyLabel: string;
  estimatedTime: string;
  platform: string;
};

export type WorkspaceContextMeeting = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
};

export type WorkspaceContextDeadline = {
  id: string;
  title: string;
  dueAt?: string;
  dueLabel?: string;
  priority: string;
};

export type WorkspaceContextEmail = {
  id: string;
  subject: string;
  from?: string;
  snippet: string;
  receivedAt?: string;
  isUnread: boolean;
};

export type WorkspaceContextTask = {
  id: string;
  title: string;
  status: string;
  section: string;
  priority: string;
  dueLabel?: string;
  estimatedTime?: string;
};

export type WorkspaceContextItem = {
  id: string;
  title: string;
  summary?: string;
};

export type WorkspaceContextPayload = {
  brief: string;
  priorities: WorkspaceContextPriority[];
  meetings: WorkspaceContextMeeting[];
  deadlines: WorkspaceContextDeadline[];
  recentEmails: WorkspaceContextEmail[];
  github: WorkspaceContextItem[];
  slack: WorkspaceContextItem[];
  tasks: WorkspaceContextTask[];
};
