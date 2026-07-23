import { Injectable } from '@nestjs/common';
import type { WorkspaceUnderstanding } from '../workspace-engine/workspace-engine.types';
import {
  classifyDeadline,
  densestDayKey,
  findIntervalOverlaps,
} from './planner.helpers';
import type {
  PlannerDeadlineSignal,
  PlannerFocusRecommendation,
  PlannerResult,
} from './planner.types';

/**
 * Planner Engine — deterministic analysis of deadlines, conflicts, and load.
 * Runs before the LLM; does not call GPT.
 */
@Injectable()
export class PlannerService {
  plan(understanding: WorkspaceUnderstanding, now = new Date()): PlannerResult {
    const nowMs = now.getTime();
    const knowledge = understanding.knowledge;
    const context = understanding.context;

    const overdueDeadlines: PlannerDeadlineSignal[] = [];
    const dueSoonDeadlines: PlannerDeadlineSignal[] = [];

    for (const d of context.deadlines) {
      const status = classifyDeadline(d.dueAt, nowMs);
      if (!status || status === 'upcoming') {
        if (!d.dueAt && d.dueLabel) {
          dueSoonDeadlines.push({
            id: d.id,
            title: d.title,
            dueAt: d.dueAt,
            dueLabel: d.dueLabel,
            priority: d.priority,
            status: 'due_soon',
          });
        }
        continue;
      }
      const signal: PlannerDeadlineSignal = {
        id: d.id,
        title: d.title,
        dueAt: d.dueAt,
        dueLabel: d.dueLabel,
        priority: d.priority,
        status,
      };
      if (status === 'overdue') overdueDeadlines.push(signal);
      else dueSoonDeadlines.push(signal);
    }

    const intervals = knowledge.meetings
      .map((m) => {
        const startMs = Date.parse(m.startsAt);
        const endMs = Date.parse(m.endsAt);
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
          return null;
        }
        return { id: m.id, title: m.title, startMs, endMs };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    const calendarConflicts = findIntervalOverlaps(intervals)
      .slice(0, 6)
      .map(({ a, b }) => ({
        aId: a.id,
        aTitle: a.title,
        bId: b.id,
        bTitle: b.title,
        startsAt: new Date(Math.max(a.startMs, b.startMs)).toISOString(),
      }));

    const densest = densestDayKey(knowledge.meetings.map((m) => m.startsAt));

    const taskBacklog = {
      today: knowledge.tasks.filter((t) => t.section === 'today').length,
      upcoming: knowledge.tasks.filter((t) => t.section === 'upcoming').length,
      waiting: knowledge.tasks.filter((t) => t.section === 'waiting').length,
      highPriority: knowledge.tasks.filter(
        (t) => t.priority === 'high' || t.priority === 'p0' || t.priority === '1',
      ).length,
    };

    const recommendedFocus: PlannerFocusRecommendation[] = [];
    for (const p of context.priorities.slice(0, 3)) {
      recommendedFocus.push({
        id: p.id,
        title: p.title,
        reason: p.reason || p.urgencyLabel || 'Top priority',
        source: 'priority',
      });
    }
    for (const d of overdueDeadlines.slice(0, 2)) {
      if (recommendedFocus.some((r) => r.id === d.id)) continue;
      recommendedFocus.push({
        id: d.id,
        title: d.title,
        reason: 'Overdue',
        source: 'deadline',
      });
    }
    // Calendar conflicts stay in notes / Schedule — not Top Priorities.

    const notes: string[] = [];
    if (overdueDeadlines.length > 0) {
      notes.push(`${overdueDeadlines.length} overdue deadline(s).`);
    }
    if (calendarConflicts.length > 0) {
      notes.push(`${calendarConflicts.length} calendar conflict(s) in the next 7 days.`);
    }
    if (taskBacklog.today + taskBacklog.highPriority > 5) {
      notes.push('Heavy task load — protect focus time.');
    }

    return {
      asOf: now.toISOString(),
      overdueDeadlines: overdueDeadlines.slice(0, 8),
      dueSoonDeadlines: dueSoonDeadlines.slice(0, 8),
      calendarConflicts,
      meetingLoad: {
        totalNext7Days: knowledge.meetings.length,
        densestDay: densest?.day,
        densestDayCount: densest?.count ?? 0,
      },
      taskBacklog,
      recommendedFocus: recommendedFocus.slice(0, 5),
      notes: notes.slice(0, 5),
    };
  }
}
