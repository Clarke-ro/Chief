import type { PlatformId } from '@/components/ui';
import type { DayPlanItem, DayPlanStatus } from '@/features/tasks/types';

const PLATFORM_SUBTITLE: Record<PlatformId, string> = {
  gmail: 'Gmail',
  calendar: 'Google Calendar',
  slack: 'Slack',
  github: 'GitHub',
  notion: 'Notion',
  asana: 'Asana',
  trello: 'Trello',
};

/** Parse display times like "9:12 AM" / "14:30" into minutes since midnight. */
export function timeToMinutes(time: string): number {
  const trimmed = time.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hour = Number(match12[1]);
    const minute = Number(match12[2]);
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'AM' && hour === 12) hour = 0;
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    return hour * 60 + minute;
  }

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return Number(match24[1]) * 60 + Number(match24[2]);
  }

  return Number.MAX_SAFE_INTEGER;
}

export function sortDayPlan(items: DayPlanItem[]): DayPlanItem[] {
  return [...items].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

export function formatClockTime(date = new Date()): string {
  let hour = date.getHours();
  const minute = date.getMinutes();
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.toString().padStart(2, '0')} ${meridiem}`;
}

/** Normalize free-typed time into `h:mm AM/PM` when possible. */
export function normalizeTimeInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match12) return null;

  let hour = Number(match12[1]);
  const minute = Number(match12[2] ?? '0');
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) return null;

  let meridiem = match12[3]?.toUpperCase();
  if (!meridiem) {
    if (hour >= 24) return null;
    meridiem = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
  } else {
    if (hour < 1 || hour > 12) return null;
  }

  return `${hour}:${minute.toString().padStart(2, '0')} ${meridiem}`;
}

export function subtitleForPlatform(platform: PlatformId): string {
  return PLATFORM_SUBTITLE[platform];
}

export function nextStatus(status: DayPlanStatus): DayPlanStatus {
  if (status === 'upcoming') return 'in_progress';
  if (status === 'in_progress') return 'completed';
  return 'upcoming';
}

export function createScheduleItem(input: {
  title: string;
  time: string;
  platform: PlatformId;
  notes?: string;
  blockKind?: DayPlanItem['blockKind'];
  focusId?: string;
}): DayPlanItem {
  const title = input.title.trim();
  const time = normalizeTimeInput(input.time) ?? formatClockTime();
  const notes = input.notes?.trim();
  const major = input.blockKind === 'major' && Boolean(input.focusId);

  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time,
    title,
    subtitle: notes || subtitleForPlatform(input.platform),
    platform: input.platform,
    status: 'upcoming',
    blockKind: major ? 'major' : 'normal',
    focusId: major ? input.focusId : undefined,
    sweepPhase: 'none',
  };
}
