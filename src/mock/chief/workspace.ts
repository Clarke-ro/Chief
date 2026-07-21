import type { ChiefWorkspace } from '@/features/chief/types';

/** Intentionally empty — Chief history is user/session data only. */
export const chiefWorkspace: ChiefWorkspace = {
  activeSessionId: '',
  sessions: [],
};
