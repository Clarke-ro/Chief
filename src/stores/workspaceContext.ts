import { create } from 'zustand';

import { type WorkspaceId } from '@/config/workspace';
import {
  getActiveWorkspaceId,
  persistActiveWorkspaceId,
} from '@/services/activeWorkspace';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type WorkspaceContextState = {
  activeWorkspaceId: WorkspaceId;
  setActiveWorkspaceId: (id: WorkspaceId) => void;
};

/**
 * Active workspace selection — scopes local data and future API queries.
 */
export const useWorkspaceContext = create<WorkspaceContextState>((set) => ({
  activeWorkspaceId: getActiveWorkspaceId(),

  setActiveWorkspaceId: (id) => {
    const next = persistActiveWorkspaceId(id);
    set({ activeWorkspaceId: next });
    useWorkspaceStore.getState().hydrateForWorkspace(next);
  },
}));
