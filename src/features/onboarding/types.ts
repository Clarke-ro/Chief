export const ONBOARDING_STEPS = [
  'welcome',
  'auth',
  'connect',
  'scan',
  'brief',
  'ready',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingAppId =
  | 'gmail'
  | 'calendar'
  | 'slack'
  | 'github'
  | 'notion'
  | 'zoom';

export type OnboardingApp = {
  id: OnboardingAppId;
  platform: OnboardingAppId;
  name: string;
  blurb: string;
};
