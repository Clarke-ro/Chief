import {
  TaskPriority,
  TaskSection,
} from '@prisma/client';

/**
 * Shared due-date classification for synced tasks across providers.
 */
export function classifyDueForTask(
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
