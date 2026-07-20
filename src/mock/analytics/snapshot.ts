import type { AnalyticsSnapshot } from '@/features/analytics/types';

export const analyticsSnapshot: AnalyticsSnapshot = {
  productivity: {
    score: 0.86,
    weeklyChange: 0.08,
    monthlyTrend: [0.62, 0.68, 0.71, 0.74, 0.78, 0.81, 0.84, 0.86],
    insight: 'Up from last week — clearer mornings, fewer context switches.',
  },
  aiImpact: [
    { id: 'hours', label: 'Hours Saved', value: 12.4 },
    { id: 'meetings', label: 'Meetings Optimized', value: 9 },
    { id: 'emails', label: 'Emails Drafted', value: 27 },
    { id: 'tasks', label: 'Tasks Prioritized', value: 64 },
    { id: 'notifications', label: 'Notifications Filtered', value: 312 },
    { id: 'conflicts', label: 'Conflicts Prevented', value: 6 },
  ],
  workBreakdown: [
    { id: 'deep', label: 'Deep Work', share: 0.34, hours: 12.2 },
    { id: 'meetings', label: 'Meetings', share: 0.28, hours: 10.1 },
    { id: 'comms', label: 'Communication', share: 0.18, hours: 6.5 },
    { id: 'planning', label: 'Planning', share: 0.12, hours: 4.3 },
    { id: 'reviews', label: 'Code Reviews', share: 0.08, hours: 2.9 },
  ],
  performance: [
    { id: 'completion', label: 'Completion Rate', value: '92%', detail: 'Priorities finished' },
    { id: 'ontime', label: 'On-Time Rate', value: '88%', detail: 'Meetings & deadlines' },
    { id: 'focus', label: 'Avg Focus Session', value: '52m', detail: 'Uninterrupted blocks' },
    { id: 'deep', label: 'Deep Work Hours', value: '12.2h', detail: 'This week' },
    { id: 'priorities', label: 'Daily Priorities', value: '4.6', detail: 'Average completed' },
  ],
  weeklyTrends: [
    {
      id: 'productivity',
      label: 'Productivity',
      points: [0.68, 0.72, 0.7, 0.78, 0.82, 0.8, 0.86],
    },
    {
      id: 'focus',
      label: 'Focus',
      points: [0.55, 0.6, 0.58, 0.66, 0.74, 0.72, 0.78],
    },
    {
      id: 'saved',
      label: 'Time Saved',
      points: [0.4, 0.48, 0.52, 0.58, 0.62, 0.7, 0.76],
    },
  ],
  achievements: [
    {
      id: 'a1',
      title: '7-Day Focus Streak',
      detail: 'Protected a focus block every day this week.',
      earned: true,
    },
    {
      id: 'a2',
      title: 'No Missed Meetings',
      detail: 'Every calendar commitment started on time.',
      earned: true,
    },
    {
      id: 'a3',
      title: 'Productivity Personal Best',
      detail: 'Highest weekly score this quarter.',
      earned: true,
    },
    {
      id: 'a4',
      title: '10 Hours Saved',
      detail: 'Chief cleared more than a full workday.',
      earned: true,
    },
    {
      id: 'a5',
      title: '100 Tasks Completed',
      detail: '17 more to unlock.',
      earned: false,
    },
  ],
};

