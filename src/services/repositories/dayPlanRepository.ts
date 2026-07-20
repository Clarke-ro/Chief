import type { DayPlanItem } from '@/features/tasks/types';
import { dayPlanSeed } from '@/mock/tasks/dayPlan';

/** Today schedule seed data. Live mutations stay in workspaceStore. */
export const dayPlanRepository = {
  getSeed(): DayPlanItem[] {
    return dayPlanSeed.map((item) => ({ ...item }));
  },
};
