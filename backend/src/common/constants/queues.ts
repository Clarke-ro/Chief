/** BullMQ queue names — processors registered in later phases. */
export const Queues = {
  SYNC: 'sync',
  AI: 'ai',
  ACTIONS: 'actions',
  BRIEFING: 'briefing',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof Queues)[keyof typeof Queues];
