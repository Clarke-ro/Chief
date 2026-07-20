import { listOnboardingIntegrations } from '@/config/integrations/registry';
import type { OnboardingApp } from '@/features/onboarding/types';
import {
  FIRST_BRIEF_ITEMS,
  SCAN_INSIGHTS,
  type ScanInsight,
} from '@/mock/integrations/onboarding';

/** Onboarding catalog data — apps come from the integrations registry. */
export const onboardingRepository = {
  listApps(): OnboardingApp[] {
    return listOnboardingIntegrations().map((item) => ({
      id: item.id as OnboardingApp['id'],
      platform: item.id as OnboardingApp['platform'],
      name: item.name,
      blurb: item.blurb,
    }));
  },

  listFirstBriefItems() {
    return FIRST_BRIEF_ITEMS;
  },

  listScanInsights(): ScanInsight[] {
    return SCAN_INSIGHTS;
  },
};
