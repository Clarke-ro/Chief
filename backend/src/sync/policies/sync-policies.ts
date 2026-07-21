import { IntegrationProvider, SyncResource } from '@prisma/client';
import type { SyncPolicyDefinition } from '../sync.types';

export const DEFAULT_SYNC_POLICIES: SyncPolicyDefinition[] = [
  {
    provider: IntegrationProvider.google,
    resource: SyncResource.email,
    initialLookbackDays: 5,
    scheduledIntervalMinutes: 15,
    allowAutomaticHistorical: false,
  },
  {
    provider: IntegrationProvider.google,
    resource: SyncResource.calendar,
    initialLookbackDays: 5,
    initialLookaheadDays: 30,
    scheduledIntervalMinutes: 15,
    allowAutomaticHistorical: false,
  },
  {
    provider: IntegrationProvider.google,
    resource: SyncResource.tasks,
    initialLookbackDays: 30,
    initialLookaheadDays: 60,
    scheduledIntervalMinutes: 15,
    allowAutomaticHistorical: false,
  },
  {
    provider: IntegrationProvider.microsoft,
    resource: SyncResource.email,
    initialLookbackDays: 5,
    scheduledIntervalMinutes: 15,
    allowAutomaticHistorical: false,
  },
  {
    provider: IntegrationProvider.microsoft,
    resource: SyncResource.calendar,
    initialLookbackDays: 5,
    initialLookaheadDays: 30,
    scheduledIntervalMinutes: 15,
    allowAutomaticHistorical: false,
  },
  {
    provider: IntegrationProvider.slack,
    resource: SyncResource.messages,
    initialLookbackDays: 5,
    scheduledIntervalMinutes: 15,
    allowAutomaticHistorical: false,
  },
  {
    provider: IntegrationProvider.github,
    resource: SyncResource.tasks,
    initialLookbackDays: 5,
    scheduledIntervalMinutes: 30,
    allowAutomaticHistorical: false,
  },
  {
    provider: IntegrationProvider.notion,
    resource: SyncResource.tasks,
    initialLookbackDays: 5,
    scheduledIntervalMinutes: 30,
    allowAutomaticHistorical: false,
  },
];

/** Map integration capability → SyncResource (skip drive/files — not in schema). */
export const CAPABILITY_TO_RESOURCE: Record<string, SyncResource> = {
  gmail: SyncResource.email,
  outlook: SyncResource.email,
  calendar: SyncResource.calendar,
  tasks: SyncResource.tasks,
  slack: SyncResource.messages,
  github: SyncResource.tasks,
  notion: SyncResource.tasks,
};

export function policiesForProvider(provider: IntegrationProvider) {
  return DEFAULT_SYNC_POLICIES.filter((p) => p.provider === provider);
}

export function findPolicy(
  provider: IntegrationProvider,
  resource: SyncResource,
) {
  return DEFAULT_SYNC_POLICIES.find(
    (p) => p.provider === provider && p.resource === resource,
  );
}
