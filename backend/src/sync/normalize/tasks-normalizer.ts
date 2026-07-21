import {
  TaskPriority,
  TaskSection,
  TaskStatus,
} from '@prisma/client';
import { classifyDueForTask } from './tasks-due';

type GoogleTaskPayload = {
  id?: unknown;
  title?: unknown;
  notes?: unknown;
  status?: unknown;
  due?: unknown;
  updated?: unknown;
  deleted?: unknown;
  parent?: unknown;
  selfLink?: unknown;
  taskListId?: unknown;
  taskListTitle?: unknown;
};

export type NormalizedTask = {
  providerTaskId: string;
  title: string;
  description: string;
  details: string;
  platform: string;
  priority: TaskPriority;
  status: TaskStatus;
  section: TaskSection;
  dueAt: Date | null;
  dueLabel: string | null;
  completedAt: Date | null;
  confidence: number;
  estimatedTime: string;
  meta: Record<string, unknown>;
  raw: Record<string, unknown>;
};

/**
 * Map a Google Tasks API item into Prisma Task fields for Home focus.
 * Incomplete tasks due today/overdue/undated → today; later due → upcoming.
 */
export function normalizeGoogleTask(
  payload: Record<string, unknown>,
  providerItemId?: string,
): NormalizedTask | null {
  const data = payload as GoogleTaskPayload;
  if (data.deleted === true) return null;

  const googleId = typeof data.id === 'string' ? data.id : null;
  const listId =
    typeof data.taskListId === 'string' ? data.taskListId : 'default';
  const providerTaskId =
    providerItemId ||
    (googleId ? `${listId}:${googleId}` : null);
  if (!providerTaskId) return null;

  const title =
    typeof data.title === 'string' && data.title.trim().length > 0
      ? data.title.trim()
      : 'Untitled task';
  const notes = typeof data.notes === 'string' ? data.notes.trim() : '';
  const listTitle =
    typeof data.taskListTitle === 'string' && data.taskListTitle.trim()
      ? data.taskListTitle.trim()
      : 'Google Tasks';

  const completed = data.status === 'completed';
  const dueAt = parseGoogleDue(data.due);
  const { section, priority, dueLabel } = classifyDueForTask(dueAt, completed);

  return {
    providerTaskId,
    title,
    description: notes
      ? notes.slice(0, 280)
      : completed
        ? `Completed in ${listTitle}`
        : `From ${listTitle}`,
    details: notes || `Synced from Google Tasks (${listTitle}).`,
    // Closest existing PlatformId on the client for a task source.
    platform: 'asana',
    priority,
    status: completed ? TaskStatus.done : TaskStatus.ready,
    section,
    dueAt,
    dueLabel,
    completedAt: completed ? parseDate(data.updated) : null,
    confidence: completed ? 0.55 : dueAt ? 0.86 : 0.74,
    estimatedTime: '15 min',
    meta: {
      source: 'google.tasks',
      taskListId: listId,
      taskListTitle: listTitle,
      googleStatus: data.status,
      parent: data.parent ?? null,
      selfLink: typeof data.selfLink === 'string' ? data.selfLink : null,
    },
    raw: payload,
  };
}

function parseGoogleDue(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  // Google often returns date-only as midnight UTC.
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
