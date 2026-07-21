/**
 * Legacy onboarding fixture exports — kept empty.
 * Connect-apps catalog comes from `@/config/integrations/registry`.
 */
import type { OnboardingApp } from '@/features/onboarding/types';

export const ONBOARDING_APPS: OnboardingApp[] = [];

export const FIRST_BRIEF_ITEMS: {
  id: string;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}[] = [];

export type ScanInsight = {
  id: string;
  label: string;
  detail: string;
};

export const SCAN_INSIGHTS: ScanInsight[] = [];
