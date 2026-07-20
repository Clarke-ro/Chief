import { create } from 'zustand';

import type { OnboardingAppId } from '@/features/onboarding/types';

type OnboardingState = {
  connected: Set<OnboardingAppId>;
  toggleApp: (id: OnboardingAppId) => void;
  connectAllSuggested: () => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  connected: new Set(),
  toggleApp: (id) => {
    const next = new Set(get().connected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ connected: next });
  },
  connectAllSuggested: () => {
    set({ connected: new Set(['gmail', 'calendar', 'slack']) });
  },
  reset: () => set({ connected: new Set() }),
}));
