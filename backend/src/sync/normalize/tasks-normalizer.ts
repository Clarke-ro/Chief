import {
  TaskPriority,
  TaskSection,
  TaskStatus,
} from '@prisma/client';

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
  const { section, priority, dueLabel } = classifyDue(dueAt, completed);

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

function classifyDue(
  dueAt: Date | null,
  completed: boolean,
): {
  section: TaskSection;
  priority: TaskPriority;
  dueLabel: string | null;
} {
  if (completed) {
    return {
      section: TaskSection.completed,
      priority: TaskPriority.low,
      dueLabel: 'Done',
    };
  }

  if (!dueAt) {
    return {
      section: TaskSection.today,
      priority: TaskPriority.medium,
      dueLabel: 'No due date',
    };
  }

  const endOfToday = endOfUtcDay(new Date());
  const startOfToday = startOfUtcDay(new Date());

  if (dueAt.getTime() < startOfToday.getTime()) {
    return {
      section: TaskSection.today,
      priority: TaskPriority.high,
      dueLabel: 'Overdue',
    };
  }

  if (dueAt.getTime() <= endOfToday.getTime()) {
    return {
      section: TaskSection.today,
      priority: TaskPriority.high,
      dueLabel: 'Due today',
    };
  }

  const inThreeDays = new Date(startOfToday);
  inThreeDays.setUTCDate(inThreeDays.getUTCDate() + 3);
  if (dueAt.getTime() <= inThreeDays.getTime()) {
    return {
      section: TaskSection.today,
      priority: TaskPriority.medium,
      dueLabel: formatDueLabel(dueAt),
    };
  }

  return {
    section: TaskSection.upcoming,
    priority: TaskPriority.low,
    dueLabel: formatDueLabel(dueAt),
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

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function formatDueLabel(dueAt: Date): string {
  return dueAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
