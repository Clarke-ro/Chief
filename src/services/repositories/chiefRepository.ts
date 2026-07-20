import type { ChiefWorkspace } from '@/features/chief/types';
import { chiefWorkspace } from '@/mock/chief/workspace';

/** Seed for Chief sessions. Live session state lives in workspaceStore. */
export const chiefRepository = {
  getWorkspace(): ChiefWorkspace {
    return {
      ...chiefWorkspace,
      sessions: chiefWorkspace.sessions.map((session) => ({
        ...session,
        turns: [...session.turns],
      })),
    };
  },
};
