import type { OnboardingAppId } from '@/features/onboarding/types';

/** Backend OAuth provider ids (matches Prisma `IntegrationProvider`). */
export type BackendIntegrationProvider = 'google' | 'microsoft' | 'slack' | 'github' | 'notion';

export const ONBOARDING_APP_PROVIDER: Record<OnboardingAppId, BackendIntegrationProvider | null> = {
  gmail: 'google',
  calendar: 'google',
  slack: 'slack',
  github: 'github',
  notion: 'notion',
  zoom: null,
};

export function providerForOnboardingApp(
  appId: OnboardingAppId,
): BackendIntegrationProvider | null {
  return ONBOARDING_APP_PROVIDER[appId] ?? null;
}

export function isOnboardingAppSupported(appId: OnboardingAppId): boolean {
  return providerForOnboardingApp(appId) !== null;
}

export function isOnboardingAppConnected(
  appId: OnboardingAppId,
  connectedProviders: ReadonlySet<string>,
): boolean {
  const provider = providerForOnboardingApp(appId);
  if (!provider) return false;
  return connectedProviders.has(provider);
}
