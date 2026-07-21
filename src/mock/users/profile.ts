import type { ProfileSnapshot } from '@/features/profile/types';

/** Intentionally empty — profile comes from auth / integrations. */
export const profileSnapshot: ProfileSnapshot = {
  user: {
    name: '',
    email: '',
    plan: 'Free',
    avatarUri: null,
  },
  connectedApps: [],
  notifications: [],
  subscription: {
    plan: 'Free',
    renewalDate: '',
  },
  appearance: {
    theme: 'System',
    accent: 'Chief Blue',
    appIcon: 'Default',
    textSize: 'Default',
  },
};
