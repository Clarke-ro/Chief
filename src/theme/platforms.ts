/**
 * Brand accent tokens for platform icons.
 * Kept in theme so components never scatter ad-hoc hex values.
 */
export const platformBrand = {
  gmail: '#EA4335',
  calendar: '#4285F4',
  drive: '#0F9D58',
  docs: '#4285F4',
  slack: '#611F69',
  github: '#24292F',
  githubDark: '#F5F5F7',
  notion: '#111113',
  notionDark: '#F5F5F7',
  trello: '#0079BF',
  asana: '#F06A6A',
  jira: '#0052CC',
  linear: '#5E6AD2',
  zoom: '#0E71EB',
  teams: '#6264A7',
  onBrand: '#FFFFFF',
} as const;

export type PlatformBrandKey = keyof typeof platformBrand;
