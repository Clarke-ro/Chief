/**
 * Legacy empty fixtures. Live data goes through `@/services/repositories`.
 * Do not import these into screens or stores.
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
