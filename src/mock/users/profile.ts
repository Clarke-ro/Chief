import type { ProfileSnapshot } from '@/features/profile/types';

export const profileSnapshot: ProfileSnapshot = {
  user: {
    name: 'Clarke Adjorlolo',
    email: 'clarke@chief.app',
    plan: 'Pro',
    avatarUri: null,
  },
  connectedApps: [
    { id: 'calendar', platform: 'calendar', name: 'Google Calendar', connected: true },
    { id: 'gmail', platform: 'gmail', name: 'Gmail', connected: true },
    { id: 'slack', platform: 'slack', name: 'Slack', connected: true },
    { id: 'github', platform: 'github', name: 'GitHub', connected: true },
    { id: 'notion', platform: 'notion', name: 'Notion', connected: false },
    { id: 'asana', platform: 'asana', name: 'Asana', connected: false },
  ],
  notifications: [
    { id: 'brief', label: 'Daily Brief', enabled: true },
    { id: 'recs', label: 'Smart Recommendations', enabled: true },
    { id: 'meetings', label: 'Meeting Reminders', enabled: true },
    { id: 'weekly', label: 'Weekly Reports', enabled: false },
    { id: 'push', label: 'Push Notifications', enabled: true },
    { id: 'email', label: 'Email Notifications', enabled: false },
  ],
  subscription: {
    plan: 'Pro',
    renewalDate: 'Aug 18, 2026',
  },
  appearance: {
    theme: 'System',
    accent: 'Chief Blue',
    appIcon: 'Default',
    textSize: 'Default',
  },
};

