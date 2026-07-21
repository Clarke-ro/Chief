import type { ProfileSnapshot } from '@/features/profile/types';

/** Default prefs only — no seeded user identity or connected apps. */
const emptyProfile: ProfileSnapshot = {
  user: {
    name: '',
    email: '',
    plan: 'Free',
    avatarUri: null,
  },
  connectedApps: [],
  notifications: [
    { id: 'brief', label: 'Daily Brief', enabled: true },
    { id: 'recs', label: 'Smart Recommendations', enabled: true },
    { id: 'meetings', label: 'Meeting Reminders', enabled: true },
    { id: 'weekly', label: 'Weekly Reports', enabled: false },
    { id: 'push', label: 'Push Notifications', enabled: true },
    { id: 'email', label: 'Email Notifications', enabled: false },
  ],
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

/** Profile defaults. Live identity + apps come from auth / integrations. */
export const profileRepository = {
  getSnapshot(): ProfileSnapshot {
    return {
      ...emptyProfile,
      user: { ...emptyProfile.user },
      connectedApps: [],
      notifications: emptyProfile.notifications.map((item) => ({ ...item })),
      subscription: { ...emptyProfile.subscription },
      appearance: { ...emptyProfile.appearance },
    };
  },
};
