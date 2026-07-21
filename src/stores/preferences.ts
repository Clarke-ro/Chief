import { Appearance, type ColorSchemeName } from 'react-native';
import { create } from 'zustand';

import { GLOBAL_KEYS } from '@/services/storageKeys';
import { storage } from '@/services/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = GLOBAL_KEYS.theme;
const ONBOARDING_KEY = GLOBAL_KEYS.onboardingCompleted;

type PreferencesState = {
  theme: ThemePreference;
  onboardingCompleted: boolean;
  setTheme: (theme: ThemePreference) => void;
  completeOnboarding: () => void;
  /** Clear local onboarding flag (logout / start fresh). */
  resetOnboarding: () => void;
};

function readTheme(): ThemePreference {
  const value = storage.getString(THEME_KEY);
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  // First launch defaults to light — not device dark.
  return 'light';
}

function readOnboardingCompleted(): boolean {
  return storage.getString(ONBOARDING_KEY) === '1';
}

/** Push preference into RN Appearance so native chrome can follow when possible. */
export function applyThemePreference(theme: ThemePreference) {
  const next: ColorSchemeName = theme === 'system' ? 'unspecified' : theme;
  // Web RN Appearance may not implement setColorScheme — calling it throws and blanks the app.
  if (typeof Appearance.setColorScheme !== 'function') {
    return;
  }
  Appearance.setColorScheme(next);
}

const initialTheme = readTheme();
applyThemePreference(initialTheme);

export const usePreferencesStore = create<PreferencesState>((set) => ({
  theme: initialTheme,
  onboardingCompleted: readOnboardingCompleted(),

  setTheme: (theme) => {
    storage.set(THEME_KEY, theme);
    applyThemePreference(theme);
    set({ theme });
  },

  completeOnboarding: () => {
    storage.set(ONBOARDING_KEY, '1');
    set({ onboardingCompleted: true });
    void import('@/services/auth/authService')
      .then(({ authService }) => authService.setOnboardingCompleted(true))
      .catch(() => {
        /* best-effort — local flag still set */
      });
  },

  resetOnboarding: () => {
    storage.remove(ONBOARDING_KEY);
    set({ onboardingCompleted: false });
  },
}));
