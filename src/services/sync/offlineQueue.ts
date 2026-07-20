import { GLOBAL_KEYS } from '@/services/storageKeys';
import { storage } from '@/services/storage';

/**
 * Offline mutation queue.
 * Persists intents to MMKV while offline; a future sync worker drains to the API.
 */

export type OfflineMutation = {
  id: string;
  workspaceId: string;
  createdAt: number;
  type: string;
  payload: unknown;
};

function isOfflineMutation(value: unknown): value is OfflineMutation {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.workspaceId === 'string' &&
    typeof row.createdAt === 'number' &&
    typeof row.type === 'string'
  );
}

function loadQueue(): OfflineMutation[] {
  const raw = storage.getString(GLOBAL_KEYS.offlineQueue);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isOfflineMutation);
  } catch {
    return [];
  }
}

function persistQueue(queue: OfflineMutation[]) {
  try {
    if (queue.length === 0) {
      storage.remove(GLOBAL_KEYS.offlineQueue);
      return;
    }
    storage.set(GLOBAL_KEYS.offlineQueue, JSON.stringify(queue));
  } catch (error) {
    if (__DEV__) {
      console.warn('[offlineQueue] persist failed', error);
    }
  }
}

let queue: OfflineMutation[] = loadQueue();

export const offlineQueue = {
  enqueue(mutation: Omit<OfflineMutation, 'id' | 'createdAt'>): OfflineMutation {
    const entry: OfflineMutation = {
      ...mutation,
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    queue = [...queue, entry];
    persistQueue(queue);
    return entry;
  },

  list(): readonly OfflineMutation[] {
    return queue;
  },

  clear(): void {
    queue = [];
    persistQueue(queue);
  },

  /**
   * Drain hook — dequeue only after each handler succeeds.
   * A failed mutation stays at the head for retry.
   */
  async flush(handler: (mutation: OfflineMutation) => Promise<void>): Promise<void> {
    while (queue.length > 0) {
      const mutation = queue[0];
      await handler(mutation);
      queue = queue.slice(1);
      persistQueue(queue);
    }
  },
};
