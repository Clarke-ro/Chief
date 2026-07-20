import { create } from 'zustand';

import type { ActionableTask } from '@/features/actions/types';

export type CanvasOverlayMode = 'panel' | 'fullscreen';

type CanvasStore = {
  task: ActionableTask | null;
  mode: CanvasOverlayMode;
  open: (task: ActionableTask, mode?: CanvasOverlayMode) => void;
  expand: () => void;
  collapse: () => void;
  close: () => void;
};

/** Overlay canvas for non-chat entry points (Home, Focus, etc.). */
export const useCanvasStore = create<CanvasStore>((set) => ({
  task: null,
  mode: 'panel',
  open: (task, mode = 'panel') => set({ task, mode }),
  expand: () => set({ mode: 'fullscreen' }),
  collapse: () => set({ mode: 'panel' }),
  close: () => set({ task: null, mode: 'panel' }),
}));
