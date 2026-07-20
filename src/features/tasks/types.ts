import type { PlatformId, PriorityLevel } from '@/components/ui';

export type TaskSectionKey = 'today' | 'upcoming' | 'waiting' | 'completed';

export type TaskStatus = 'ready' | 'in_progress' | 'waiting' | 'done';

/** Timeline status for schedule rows */
export type DayPlanStatus = 'completed' | 'in_progress' | 'upcoming';

/** Normal blocks auto-cross when due; major blocks get an AI app sweep first. */
export type ScheduleBlockKind = 'normal' | 'major';

/** Outcome of Chief’s post-due sweep for focus-linked major blocks. */
export type SweepPhase = 'none' | 'checking' | 'cleared' | 'still_open';

export type DayPlanItem = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  platform: PlatformId;
  status: DayPlanStatus;
  duration?: string;
  /** Relative countdown shown in warning tone, e.g. "Starts in 1h 20m" */
  startsIn?: string;
  /** Optional attendee count shown under the title */
  attendees?: number;
  /** Defaults to normal — crosses out when time passes with no sweep */
  blockKind?: ScheduleBlockKind;
  /** Linked Home focus item when this is a major priority block */
  focusId?: string;
  /** AI sweep state after the scheduled time passes */
  sweepPhase?: SweepPhase;
  /** Epoch ms of last app sweep (major blocks only) */
  lastSweepAt?: number;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  details: string;
  platform: PlatformId;
  priority: PriorityLevel;
  estimatedTime: string;
  estimatedMinutes: number;
  /** Present when AI suggested or enriched the task */
  confidence?: number;
  status: TaskStatus;
  section: TaskSectionKey;
  /** Left-rail schedule label (time, day, or status cue) */
  dueLabel: string;
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  ready: 'Ready',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  done: 'Done',
};
