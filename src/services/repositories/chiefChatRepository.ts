import { env } from '@/config/env';
import type { ConversationTurn } from '@/features/chief/types';
import { ensureActiveWorkspaceId } from '@/services/activeWorkspace';
import { apiJson, ApiError, ApiNetworkError } from '@/services/api/client';

export type ChiefChatResponse = {
  content: string;
  workspaceId: string;
  provider?: string;
  model?: string;
};

type ChatOptions = {
  workspaceId?: string;
  focusId?: string;
  history?: ConversationTurn[];
};

/**
 * Live Chief chat — backend builds structured workspace context and calls the model.
 */
export const chiefChatRepository = {
  async send(message: string, options: ChatOptions = {}): Promise<ChiefChatResponse> {
    const workspaceId =
      options.workspaceId?.trim() || (await ensureActiveWorkspaceId());

    const history = (options.history ?? [])
      .filter((turn) => turn.role === 'user' || turn.role === 'chief')
      .slice(-8)
      .map((turn) => ({
        role: turn.role,
        content: turn.content.trim().slice(0, 2000),
      }))
      .filter((turn) => turn.content.length > 0);

    try {
      return await apiJson<ChiefChatResponse>('/v1/chief/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          workspaceId,
          focusId: options.focusId,
          history,
        }),
      });
    } catch (error) {
      if (error instanceof ApiError || error instanceof ApiNetworkError) {
        throw error;
      }
      throw new ApiNetworkError('Chief chat request failed.');
    }
  },

  /** True when the client should prefer live chat over local mock replies. */
  shouldUseLiveChat(): boolean {
    if (!env.isApiConfigured) return false;
    return env.aiProvider !== 'mock';
  },
};
