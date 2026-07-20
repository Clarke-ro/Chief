import type { PlatformIconId } from '@/components/ui';

export type IntegrationCategory =
  | 'email'
  | 'calendar'
  | 'chat'
  | 'code'
  | 'docs'
  | 'tasks'
  | 'meetings'
  | 'storage';

export type IntegrationDefinition = {
  id: PlatformIconId;
  name: string;
  category: IntegrationCategory;
  /** Short copy for onboarding / connect grids */
  blurb: string;
  /** Shown in first-run connect step */
  onboardingDefault?: boolean;
};

/**
 * Canonical integration catalog.
 * Add entries here to scale toward 50+ connectors without scattering IDs across screens.
 */
export const INTEGRATION_REGISTRY: readonly IntegrationDefinition[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'email',
    blurb: 'Threads that need a decision today',
    onboardingDefault: true,
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    category: 'calendar',
    blurb: 'Meetings, focus blocks, conflicts',
    onboardingDefault: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'chat',
    blurb: 'Mentions that block other people',
    onboardingDefault: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'code',
    blurb: 'Reviews waiting on you',
    onboardingDefault: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'docs',
    blurb: 'Docs tied to active work',
    onboardingDefault: true,
  },
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'meetings',
    blurb: 'Upcoming calls on your day',
    onboardingDefault: true,
  },
  {
    id: 'asana',
    name: 'Asana',
    category: 'tasks',
    blurb: 'Tasks and project boards',
  },
  {
    id: 'trello',
    name: 'Trello',
    category: 'tasks',
    blurb: 'Lightweight boards and cards',
  },
  {
    id: 'linear',
    name: 'Linear',
    category: 'tasks',
    blurb: 'Engineering issues and cycles',
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'tasks',
    blurb: 'Sprint work and tickets',
  },
  {
    id: 'drive',
    name: 'Google Drive',
    category: 'storage',
    blurb: 'Files linked to priorities',
  },
  {
    id: 'docs',
    name: 'Google Docs',
    category: 'docs',
    blurb: 'Docs in active review',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'chat',
    blurb: 'Channels and meeting chats',
  },
] as const;

const byId = new Map(INTEGRATION_REGISTRY.map((item) => [item.id, item]));

export function getIntegration(id: PlatformIconId): IntegrationDefinition | undefined {
  return byId.get(id);
}

export function listIntegrations(category?: IntegrationCategory): IntegrationDefinition[] {
  if (!category) return [...INTEGRATION_REGISTRY];
  return INTEGRATION_REGISTRY.filter((item) => item.category === category);
}

export function listOnboardingIntegrations(): IntegrationDefinition[] {
  return INTEGRATION_REGISTRY.filter((item) => item.onboardingDefault);
}
