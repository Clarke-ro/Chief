import type { ProfileSnapshot } from '@/features/profile/types';
import { profileSnapshot } from '@/mock/users/profile';

/** Seed for profile. Live profile state lives in workspaceStore. */
export const profileRepository = {
  getSnapshot(): ProfileSnapshot {
    return profileSnapshot;
  },
};
