import { create } from 'zustand';

import type { AnalyticsSnapshot } from '@/features/analytics/types';
import type { FocusItem, HomeBrief } from '@/features/brief/types';
import type { ChatSession, ConversationTurn } from '@/features/chief/types';
import type { ProfileSnapshot } from '@/features/profile/types';
import { applyDueScheduleLogic } from '@/features/tasks/scheduleSweep';
import { sortDayPlan } from '@/features/tasks/scheduleUtils';
import type { DayPlanItem, DayPlanStatus, ScheduleBlockKind, SweepPhase } from '@/features/tasks/types';
import type { WorkspaceId } from '@/config/workspace';
import { env } from '@/config/env';
import {
  analyticsRepository,
  briefRepository,
  chiefRepository,
  dayPlanRepository,
  profileRepository,
} from '@/services/repositories';
import { getActiveWorkspaceId } from '@/services/activeWorkspace';
import { LEGACY_KEYS, workspaceDataKeys } from '@/services/storageKeys';
import { storage } from '@/services/storage';

const STATUSES = new Set<DayPlanStatus>(['completed', 'in_progress', 'upcoming']);
const BLOCK_KINDS = new Set<ScheduleBlockKind>(['normal', 'major']);
const SWEEP_PHASES = new Set<SweepPhase>(['none', 'checking', 'cleared', 'still_open']);

type WorkspaceState = {
  brief: HomeBrief;
  dayPlan: DayPlanItem[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  analytics: AnalyticsSnapshot;
  profile: ProfileSnapshot;

  /** Brief */
  refreshBrief: () => Promise<void>;
  completeFocus: (sourceKey: string) => Promise<void>;
  getFocusById: (id: string) => FocusItem | undefined;
  listFocus: () => FocusItem[];

  /** Today schedule */
  refreshDayPlan: () => Promise<void>;
  addDayPlanItem: (item: DayPlanItem) => void;
  updateDayPlanItem: (id: string, patch: Partial<DayPlanItem>) => void;
  removeDayPlanItem: (id: string) => void;
  setDayPlanStatus: (id: string, status: DayPlanStatus) => void;
  runDueSweep: (now?: Date) => void;
  resetDayPlan: () => void;

  /** Chief */
  setActiveSessionId: (id: string | null) => void;
  appendChiefTurns: (
    userTurn: ConversationTurn,
    chiefTurn: ConversationTurn,
    titleSeed: string,
  ) => void;

  /** Profile */
  setNotificationEnabled: (id: string, enabled: boolean) => void;
  /** Apply signed-in user identity to profile + greeting. */
  applyUserIdentity: (user: {
    name: string;
    email: string;
    image?: string | null;
  }) => void;

  /** Chief — append a user turn immediately (optimistic). */
  appendUserTurn: (userTurn: ConversationTurn, titleSeed: string) => void;
  /** Chief — append Chief reply to the active session. */
  appendChiefReply: (chiefTurn: ConversationTurn) => void;

  /** After log out — reload seed data into memory (storage already cleared). */
  resetAfterLogout: () => void;

  /** Reload persisted slices for a workspace (multi-workspace switch). */
  hydrateForWorkspace: (workspaceId: WorkspaceId) => void;
};

function dataKeys(workspaceId: WorkspaceId = getActiveWorkspaceId()) {
  return workspaceDataKeys(workspaceId);
}

/** Prefer scoped key; one-time migrate from legacy unscoped keys. */
function readScopedString(scopedKey: string, legacyKey: string): string | undefined {
  const scoped = storage.getString(scopedKey);
  if (scoped) return scoped;
  const legacy = storage.getString(legacyKey);
  if (!legacy) return undefined;
  storage.set(scopedKey, legacy);
  storage.remove(legacyKey);
  return legacy;
}

function isDayPlanItem(value: unknown): value is DayPlanItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.time !== 'string') return false;
  if (typeof item.title !== 'string') return false;
  if (typeof item.subtitle !== 'string') return false;
  if (typeof item.platform !== 'string') return false;
  if (typeof item.status !== 'string' || !STATUSES.has(item.status as DayPlanStatus)) {
    return false;
  }
  if (item.blockKind != null && !BLOCK_KINDS.has(item.blockKind as ScheduleBlockKind)) {
    return false;
  }
  if (item.sweepPhase != null && !SWEEP_PHASES.has(item.sweepPhase as SweepPhase)) {
    return false;
  }
  return true;
}

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName;
}

function withProfileName(brief: HomeBrief, profile: ProfileSnapshot): HomeBrief {
  return { ...brief, userName: firstName(profile.user.name) };
}

function seedDayPlan(): DayPlanItem[] {
  return sortDayPlan(dayPlanRepository.getSeed());
}

function readDayPlan(workspaceId?: WorkspaceId): DayPlanItem[] {
  const keys = dataKeys(workspaceId);
  const raw = readScopedString(keys.dayPlan, LEGACY_KEYS.dayPlan);
  const emptyFallback = () => (env.liveHomeBrief ? [] : seedDayPlan());
  if (!raw) return emptyFallback();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return emptyFallback();
    const items = parsed.filter(isDayPlanItem);
    if (items.length === 0) return emptyFallback();
    return sortDayPlan(items);
  } catch {
    return emptyFallback();
  }
}

function persistDayPlan(items: DayPlanItem[]) {
  try {
    storage.set(dataKeys().dayPlan, JSON.stringify(items));
  } catch (error) {
    if (__DEV__) {
      console.warn('[workspaceStore] persistDayPlan failed', error);
    }
  }
}

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.id === 'string' &&
    typeof session.title === 'string' &&
    typeof session.updatedAt === 'string' &&
    typeof session.preview === 'string' &&
    Array.isArray(session.turns)
  );
}

function readSessions(workspaceId?: WorkspaceId): ChatSession[] {
  const keys = dataKeys(workspaceId);
  const raw = readScopedString(keys.sessions, LEGACY_KEYS.sessions);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sessions = parsed.filter(isChatSession);
        if (sessions.length > 0) return sessions;
      }
    } catch {
      /* fall through */
    }
  }
  return chiefRepository.getWorkspace().sessions;
}

function persistSessions(sessions: ChatSession[]) {
  try {
    storage.set(dataKeys().sessions, JSON.stringify(sessions));
  } catch (error) {
    if (__DEV__) {
      console.warn('[workspaceStore] persistSessions failed', error);
    }
  }
}

function readProfile(workspaceId?: WorkspaceId): ProfileSnapshot {
  const base = profileRepository.getSnapshot();
  const keys = dataKeys(workspaceId);
  const raw = readScopedString(keys.notifications, LEGACY_KEYS.notifications);
  if (!raw) return base;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return base;
    const enabledById = new Map<string, boolean>();
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      if (typeof row.id === 'string' && typeof row.enabled === 'boolean') {
        enabledById.set(row.id, row.enabled);
      }
    }
    if (enabledById.size === 0) return base;
    return {
      ...base,
      notifications: base.notifications.map((item) => {
        const enabled = enabledById.get(item.id);
        return enabled == null ? item : { ...item, enabled };
      }),
    };
  } catch {
    return base;
  }
}

function persistNotifications(profile: ProfileSnapshot) {
  try {
    storage.set(
      dataKeys().notifications,
      JSON.stringify(profile.notifications.map(({ id, enabled }) => ({ id, enabled }))),
    );
  } catch (error) {
    if (__DEV__) {
      console.warn('[workspaceStore] persistNotifications failed', error);
    }
  }
}

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 36) return trimmed;
  return `${trimmed.slice(0, 36)}…`;
}

/** Derive Home success + Analytics productivity from Today completion ratio. */
function syncProgress(
  brief: HomeBrief,
  analytics: AnalyticsSnapshot,
  dayPlan: DayPlanItem[],
): Pick<WorkspaceState, 'brief' | 'analytics'> {
  // Live brief owns score/copy — don't overwrite with mock day-plan heuristics.
  if (env.liveHomeBrief || dayPlan.length === 0) {
    return { brief, analytics };
  }
  const completed = dayPlan.filter((item) => item.status === 'completed').length;
  const ratio = completed / dayPlan.length;
  const successScore = Math.min(0.98, Math.round((0.62 + ratio * 0.36) * 100) / 100);
  const productivityScore = Math.min(0.98, Math.round((0.7 + ratio * 0.28) * 100) / 100);

  return {
    brief: {
      ...brief,
      successScore,
      successLabel: ratio >= 0.8 ? 'Crushing it' : ratio >= 0.45 ? 'On track' : 'Needs focus',
      successInsight:
        ratio >= 0.8
          ? 'Most of today is cleared — protect the remaining deep-work blocks.'
          : ratio >= 0.45
            ? 'Clear the Focus list before noon and the rest of the day opens up.'
            : 'Finish the next schedule block to get the day back on track.',
    },
    analytics: {
      ...analytics,
      productivity: {
        ...analytics.productivity,
        score: productivityScore,
        insight:
          ratio >= 0.8
            ? 'Strong completion today — fewer context switches than last week.'
            : ratio >= 0.45
              ? 'Up from last week — clearer mornings, fewer context switches.'
              : 'Completion is lagging — knock out the next block to recover momentum.',
      },
    },
  };
}

const initialProfile = readProfile();
const initialBrief = withProfileName(briefRepository.getHomeBrief(), initialProfile);
const initialDayPlan = readDayPlan();
const initialAnalytics = analyticsRepository.getSnapshot();
const initialSynced = syncProgress(initialBrief, initialAnalytics, initialDayPlan);

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  brief: initialSynced.brief,
  dayPlan: initialDayPlan,
  sessions: readSessions(),
  activeSessionId: null,
  analytics: initialSynced.analytics,
  profile: initialProfile,

  refreshBrief: async () => {
    const { profile, dayPlan, analytics } = get();
    const loaded = await briefRepository.fetchHomeBrief();
    const next = withProfileName(loaded, profile);
    const synced = syncProgress(next, analytics, dayPlan);
    set({ brief: synced.brief, analytics: synced.analytics });
  },

  completeFocus: async (sourceKey) => {
    const { profile, dayPlan, analytics, brief } = get();
    // Optimistic remove so the list doesn't flash the item back.
    const optimistic: HomeBrief = {
      ...brief,
      focus: brief.focus.filter((item) => item.id !== sourceKey),
    };
    set({ brief: withProfileName(optimistic, profile) });
    briefRepository.persistCache(optimistic);

    try {
      const loaded = await briefRepository.completeFocus(sourceKey);
      const next = withProfileName(loaded, profile);
      const synced = syncProgress(next, analytics, dayPlan);
      set({ brief: synced.brief, analytics: synced.analytics });
    } catch (error) {
      if (__DEV__) {
        console.warn('[workspaceStore] completeFocus failed', error);
      }
      await get().refreshBrief();
    }
  },

  getFocusById: (id) => get().brief.focus.find((item) => item.id === id),

  listFocus: () => get().brief.focus,

  refreshDayPlan: async () => {
    const { brief, analytics } = get();
    try {
      const loaded = await dayPlanRepository.fetchDayPlan();
      const dayPlan = sortDayPlan(loaded);
      persistDayPlan(dayPlan);
      const synced = syncProgress(brief, analytics, dayPlan);
      set({ dayPlan, ...synced });
    } catch (error) {
      if (__DEV__) {
        console.warn('[workspaceStore] refreshDayPlan failed', error);
      }
    }
  },

  addDayPlanItem: (item) => {
    const dayPlan = sortDayPlan([...get().dayPlan, item]);
    persistDayPlan(dayPlan);
    const synced = syncProgress(get().brief, get().analytics, dayPlan);
    set({ dayPlan, ...synced });

    if (!env.liveHomeBrief) return;
    void (async () => {
      try {
        const created = await dayPlanRepository.create(item);
        const next = sortDayPlan(
          get().dayPlan.map((row) => (row.id === item.id ? created : row)),
        );
        // If optimistic id already removed, append server.
        const hasCreated = next.some((row) => row.id === created.id);
        const merged = hasCreated
          ? next
          : sortDayPlan([...get().dayPlan.filter((row) => row.id !== item.id), created]);
        persistDayPlan(merged);
        set({ dayPlan: merged, ...syncProgress(get().brief, get().analytics, merged) });
      } catch (error) {
        if (__DEV__) {
          console.warn('[workspaceStore] addDayPlanItem failed', error);
        }
        await get().refreshDayPlan();
      }
    })();
  },

  updateDayPlanItem: (id, patch) => {
    const dayPlan = sortDayPlan(
      get().dayPlan.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    persistDayPlan(dayPlan);
    const synced = syncProgress(get().brief, get().analytics, dayPlan);
    set({ dayPlan, ...synced });

    if (!env.liveHomeBrief) return;
    void (async () => {
      try {
        const updated = await dayPlanRepository.update(id, patch);
        const next = sortDayPlan(
          get().dayPlan.map((item) => (item.id === id || item.id === updated.id ? updated : item)),
        );
        persistDayPlan(next);
        set({ dayPlan: next, ...syncProgress(get().brief, get().analytics, next) });
      } catch (error) {
        if (__DEV__) {
          console.warn('[workspaceStore] updateDayPlanItem failed', error);
        }
        await get().refreshDayPlan();
      }
    })();
  },

  removeDayPlanItem: (id) => {
    const dayPlan = get().dayPlan.filter((item) => item.id !== id);
    persistDayPlan(dayPlan);
    const synced = syncProgress(get().brief, get().analytics, dayPlan);
    set({ dayPlan, ...synced });

    if (!env.liveHomeBrief) return;
    void (async () => {
      try {
        await dayPlanRepository.remove(id);
      } catch (error) {
        if (__DEV__) {
          console.warn('[workspaceStore] removeDayPlanItem failed', error);
        }
        await get().refreshDayPlan();
      }
    })();
  },

  setDayPlanStatus: (id, status) => {
    get().updateDayPlanItem(id, { status });
  },

  runDueSweep: (now = new Date()) => {
    const { dayPlan, brief } = get();
    const next = applyDueScheduleLogic(dayPlan, brief.focus, brief.briefing, now);
    if (next === dayPlan) return;
    const sorted = sortDayPlan(next);
    persistDayPlan(sorted);
    const synced = syncProgress(brief, get().analytics, sorted);
    set({ dayPlan: sorted, ...synced });

    if (!env.liveHomeBrief) return;
    const prevById = new Map(dayPlan.map((item) => [item.id, item]));
    for (const item of sorted) {
      const prev = prevById.get(item.id);
      if (!prev) continue;
      if (
        prev.status === item.status &&
        prev.sweepPhase === item.sweepPhase &&
        prev.lastSweepAt === item.lastSweepAt
      ) {
        continue;
      }
      // Skip unsynced optimistic client ids until create lands.
      if (item.id.startsWith('plan-')) continue;
      void dayPlanRepository
        .update(item.id, {
          status: item.status,
          sweepPhase: item.sweepPhase,
          lastSweepAt: item.lastSweepAt,
        })
        .catch((error) => {
          if (__DEV__) {
            console.warn('[workspaceStore] sweep persist failed', error);
          }
        });
    }
  },

  resetDayPlan: () => {
    const dayPlan = seedDayPlan();
    persistDayPlan(dayPlan);
    const synced = syncProgress(get().brief, get().analytics, dayPlan);
    set({ dayPlan, ...synced });
  },

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  appendChiefTurns: (userTurn, chiefTurn, titleSeed) => {
    get().appendUserTurn(userTurn, titleSeed);
    get().appendChiefReply(chiefTurn);
  },

  appendUserTurn: (userTurn, titleSeed) => {
    const { activeSessionId, sessions } = get();

    if (!activeSessionId) {
      const id = `session-new-${Date.now()}`;
      const session: ChatSession = {
        id,
        title: titleFromPrompt(titleSeed),
        updatedAt: 'Just now',
        preview: titleSeed,
        turns: [userTurn],
      };
      const next = [session, ...sessions];
      persistSessions(next);
      set({ sessions: next, activeSessionId: id });
      return;
    }

    const next = sessions.map((session) => {
      if (session.id !== activeSessionId) return session;
      return {
        ...session,
        title: session.turns.length === 0 ? titleFromPrompt(titleSeed) : session.title,
        updatedAt: 'Just now',
        preview: titleSeed,
        turns: [...session.turns, userTurn],
      };
    });
    persistSessions(next);
    set({ sessions: next });
  },

  appendChiefReply: (chiefTurn) => {
    const { activeSessionId, sessions } = get();
    if (!activeSessionId) return;

    const next = sessions.map((session) => {
      if (session.id !== activeSessionId) return session;
      return {
        ...session,
        updatedAt: 'Just now',
        turns: [...session.turns, chiefTurn],
      };
    });
    persistSessions(next);
    set({ sessions: next });
  },

  applyUserIdentity: (user) => {
    const name = user.name?.trim() || get().profile.user.name;
    const email = user.email?.trim() || get().profile.user.email;
    const profile: ProfileSnapshot = {
      ...get().profile,
      user: {
        ...get().profile.user,
        name,
        email,
        avatarUri: user.image ?? get().profile.user.avatarUri,
      },
    };
    set({
      profile,
      brief: withProfileName(get().brief, profile),
    });
  },

  setNotificationEnabled: (id, enabled) => {
    const profile: ProfileSnapshot = {
      ...get().profile,
      notifications: get().profile.notifications.map((item) =>
        item.id === id ? { ...item, enabled } : item,
      ),
    };
    persistNotifications(profile);
    set({ profile });
  },

  resetAfterLogout: () => {
    get().hydrateForWorkspace(getActiveWorkspaceId());
  },

  hydrateForWorkspace: (workspaceId) => {
    const profile = readProfile(workspaceId);
    const brief = withProfileName(briefRepository.getHomeBrief(workspaceId), profile);
    const dayPlan = readDayPlan(workspaceId);
    const analytics = analyticsRepository.getSnapshot();
    const synced = syncProgress(brief, analytics, dayPlan);
    set({
      brief: synced.brief,
      dayPlan,
      sessions: readSessions(workspaceId),
      activeSessionId: null,
      analytics: synced.analytics,
      profile,
    });
  },
}));
