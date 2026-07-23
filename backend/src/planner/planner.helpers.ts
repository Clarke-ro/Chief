export type Interval = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
};

/** Detect pairwise overlaps among intervals (sorted by start). */
export function findIntervalOverlaps(
  intervals: Interval[],
): Array<{ a: Interval; b: Interval }> {
  const sorted = [...intervals].sort((x, y) => x.startMs - y.startMs);
  const overlaps: Array<{ a: Interval; b: Interval }> = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (b.startMs >= a.endMs) break;
      if (a.startMs < b.endMs && b.startMs < a.endMs) {
        overlaps.push({ a, b });
      }
    }
  }
  return overlaps;
}

export function densestDayKey(
  startsAtIso: string[],
): { day: string; count: number } | null {
  if (startsAtIso.length === 0) return null;
  const counts = new Map<string, number>();
  for (const iso of startsAtIso) {
    const day = iso.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  let bestDay = '';
  let bestCount = 0;
  for (const [day, count] of counts) {
    if (count > bestCount) {
      bestDay = day;
      bestCount = count;
    }
  }
  return bestDay ? { day: bestDay, count: bestCount } : null;
}

export function classifyDeadline(
  dueAt: string | undefined,
  nowMs: number,
): 'overdue' | 'due_soon' | 'upcoming' | null {
  if (!dueAt) return null;
  const dueMs = Date.parse(dueAt);
  if (!Number.isFinite(dueMs)) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  if (dueMs < nowMs) return 'overdue';
  if (dueMs <= nowMs + 2 * dayMs) return 'due_soon';
  if (dueMs <= nowMs + 7 * dayMs) return 'upcoming';
  return null;
}
