import type { ChiefWorkspace } from '@/features/chief/types';

/** Empty Chief workspace — live sessions live in workspaceStore / MMKV. */
export const chiefRepository = {
  getWorkspace(): ChiefWorkspace {
    return {
      activeSessionId: '',
      sessions: [],
    };
  },
};
