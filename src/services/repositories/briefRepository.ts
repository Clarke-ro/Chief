import type { FocusItem, HomeBrief } from '@/features/brief/types';
import { homeBrief } from '@/mock/briefings/homeBrief';

/** Seed for Home brief + focus. Live reads/writes go through workspaceStore. */
export const briefRepository = {
  getHomeBrief(): HomeBrief {
    return homeBrief;
  },

  getFocusById(id: string): FocusItem | undefined {
    return homeBrief.focus.find((item) => item.id === id);
  },

  listFocus(): FocusItem[] {
    return homeBrief.focus;
  },

  listBriefing() {
    return homeBrief.briefing;
  },
};
