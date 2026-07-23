export type PlannerConflict = {
  aId: string;
  aTitle: string;
  bId: string;
  bTitle: string;
  startsAt: string;
};

export type PlannerDeadlineSignal = {
  id: string;
  title: string;
  dueAt?: string;
  dueLabel?: string;
  priority: string;
  status: 'overdue' | 'due_soon' | 'upcoming';
};

export type PlannerFocusRecommendation = {
  id: string;
  title: string;
  reason: string;
  source: 'priority' | 'deadline' | 'meeting' | 'task';
};

export type PlannerResult = {
  asOf: string;
  overdueDeadlines: PlannerDeadlineSignal[];
  dueSoonDeadlines: PlannerDeadlineSignal[];
  calendarConflicts: PlannerConflict[];
  meetingLoad: {
    totalNext7Days: number;
    densestDay?: string;
    densestDayCount: number;
  };
  taskBacklog: {
    today: number;
    upcoming: number;
    waiting: number;
    highPriority: number;
  };
  recommendedFocus: PlannerFocusRecommendation[];
  notes: string[];
};
