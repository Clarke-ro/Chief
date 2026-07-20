/**
 * Central mock fixtures for the Chief frontend.
 * Screens and stores should prefer `@/services/repositories` over importing these directly.
 */
export { homeBrief } from './briefings/homeBrief';
export { dayPlanSeed } from './tasks/dayPlan';
export { taskInventory } from './tasks/inventory';
export { profileSnapshot } from './users/profile';
export { analyticsSnapshot } from './analytics/snapshot';
export { chiefWorkspace } from './chief/workspace';
export {
  ONBOARDING_APPS,
  FIRST_BRIEF_ITEMS,
  SCAN_INSIGHTS,
  type ScanInsight,
} from './integrations/onboarding';
