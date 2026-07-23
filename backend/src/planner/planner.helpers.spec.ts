import {
  classifyDeadline,
  densestDayKey,
  findIntervalOverlaps,
} from './planner.helpers';

describe('planner.helpers', () => {
  describe('findIntervalOverlaps', () => {
    it('detects overlapping meetings', () => {
      const overlaps = findIntervalOverlaps([
        { id: 'a', title: 'A', startMs: 100, endMs: 200 },
        { id: 'b', title: 'B', startMs: 150, endMs: 250 },
        { id: 'c', title: 'C', startMs: 300, endMs: 400 },
      ]);
      expect(overlaps).toHaveLength(1);
      expect(overlaps[0].a.id).toBe('a');
      expect(overlaps[0].b.id).toBe('b');
    });

    it('returns empty when no overlaps', () => {
      expect(
        findIntervalOverlaps([
          { id: 'a', title: 'A', startMs: 0, endMs: 10 },
          { id: 'b', title: 'B', startMs: 10, endMs: 20 },
        ]),
      ).toHaveLength(0);
    });
  });

  describe('densestDayKey', () => {
    it('picks the day with most starts', () => {
      const result = densestDayKey([
        '2026-07-23T10:00:00.000Z',
        '2026-07-23T14:00:00.000Z',
        '2026-07-24T09:00:00.000Z',
      ]);
      expect(result).toEqual({ day: '2026-07-23', count: 2 });
    });

    it('returns null for empty input', () => {
      expect(densestDayKey([])).toBeNull();
    });
  });

  describe('classifyDeadline', () => {
    const now = Date.parse('2026-07-23T12:00:00.000Z');

    it('marks past due as overdue', () => {
      expect(classifyDeadline('2026-07-22T12:00:00.000Z', now)).toBe('overdue');
    });

    it('marks within 2 days as due_soon', () => {
      expect(classifyDeadline('2026-07-24T12:00:00.000Z', now)).toBe('due_soon');
    });

    it('marks within 7 days as upcoming', () => {
      expect(classifyDeadline('2026-07-28T12:00:00.000Z', now)).toBe('upcoming');
    });

    it('returns null without a date', () => {
      expect(classifyDeadline(undefined, now)).toBeNull();
    });
  });
});
