import { listOnboardingIntegrations } from '@/config/integrations/registry';
import type { OnboardingApp } from '@/features/onboarding/types';

/** Onboarding catalog — apps come from the integrations registry only. */
export const onboardingRepository = {
  listApps(): OnboardingApp[] {
    return listOnboardingIntegrations().map((item) => ({
      id: item.id as OnboardingApp['id'],
      platform: item.id as OnboardingApp['platform'],
      name: item.name,
      blurb: item.blurb,
    }));
  },
};
