import { ensureActiveWorkspaceId, getActiveWorkspaceId } from '@/services/activeWorkspace';
import { apiJson } from '@/services/api/client';

export type InboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  channel: string;
  readAt: string | null;
  createdAt: string;
  meta: Record<string, unknown> | null;
};

export type NotificationsListResponse = {
  items: InboxNotification[];
  unreadCount: number;
};

export const notificationsRepository = {
  async list(opts?: {
    workspaceId?: string;
    unreadOnly?: boolean;
  }): Promise<NotificationsListResponse> {
    const workspaceId = opts?.workspaceId ?? (await ensureActiveWorkspaceId());
    const query = new URLSearchParams({ workspaceId });
    if (opts?.unreadOnly) query.set('unreadOnly', 'true');
    return apiJson<NotificationsListResponse>(
      `/v1/workspace/notifications?${query.toString()}`,
    );
  },

  async markRead(id: string, workspaceId?: string): Promise<InboxNotification> {
    const ws = workspaceId ?? getActiveWorkspaceId() ?? (await ensureActiveWorkspaceId());
    return apiJson<InboxNotification>(
      `/v1/workspace/notifications/${encodeURIComponent(id)}/read`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: ws }),
      },
    );
  },

  async markAllRead(workspaceId?: string): Promise<{ updated: number }> {
    const ws = workspaceId ?? getActiveWorkspaceId() ?? (await ensureActiveWorkspaceId());
    return apiJson<{ updated: number }>('/v1/workspace/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: ws }),
    });
  },

  async registerPushToken(token: string, platform: string): Promise<{ ok: boolean }> {
    return apiJson<{ ok: boolean }>('/v1/workspace/notifications/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform }),
    });
  },
};
