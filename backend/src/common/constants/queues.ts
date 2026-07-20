/** BullMQ queue names — processors registered in the worker process. */
export const Queues = {
  SYNC: 'sync',
  AI: 'ai',
  ACTIONS: 'actions',
  BRIEFING: 'briefing',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof Queues)[keyof typeof Queues];

/** Repeatable / scheduled job ids (stable across deploys). BullMQ forbids `:` in custom ids. */
export const ScheduledJobs = {
  SYNC_DUE_ACCOUNTS: 'sync-due-accounts',
  BRIEFING_MORNING: 'briefing-morning',
  ANALYTICS_DAILY: 'analytics-daily',
  NOTIFICATIONS_DIGEST: 'notifications-digest',
} as const;

export type SyncJobName =
  | 'sync.account'
  | 'sync.calendar'
  | 'sync.email'
  | 'sync.contacts'
  | 'sync.tasks'
  | 'sync.messages'
  | 'sync.due-accounts';

export type BriefingJobName = 'briefing.generate' | 'briefing.morning';

export type AnalyticsJobName = 'analytics.snapshot' | 'analytics.daily';

export type NotificationJobName = 'notifications.dispatch' | 'notifications.digest';

export type AiJobName = 'ai.reason' | 'ai.embed';

export type ActionsJobName = 'actions.execute';
