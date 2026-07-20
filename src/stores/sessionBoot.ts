import { create } from 'zustand';

import type { MeResponse } from '@/services/auth/types';

type SessionBootState = {
  ready: boolean;
  hasSession: boolean;
  me: MeResponse | null;
  markSignedIn: (me: MeResponse) => void;
  markSignedOut: () => void;
  markReady: (result: { me: MeResponse | null }) => void;
};

/**
 * Boot/session gate for routing.
 * `ensureSessionBoot()` hydrates bearer + Better Auth from durable storage once.
 */
export const useSessionBootStore = create<SessionBootState>((set) => ({
  ready: false,
  hasSession: false,
  me: null,

  markSignedIn: (me) => set({ ready: true, hasSession: true, me }),
  markSignedOut: () => set({ ready: true, hasSession: false, me: null }),
  markReady: ({ me }) => set({ ready: true, hasSession: Boolean(me), me }),
}));

let bootPromise: Promise<void> | null = null;

/** Idempotent cold-start restore — call from root layout / index. */
export function ensureSessionBoot(): Promise<void> {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    try {
      const { authService } = await import('@/services/auth/authService');
      const me = await authService.restoreSession();
      useSessionBootStore.getState().markReady({ me });
    } catch {
      useSessionBootStore.getState().markReady({ me: null });
    }
  })();

  return bootPromise;
}
