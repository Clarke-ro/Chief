import { env } from '@/config/env';
import type { ConversationTurn } from '@/features/chief/types';
import { ensureActiveWorkspaceId } from '@/services/activeWorkspace';
import { apiFetch, apiJson, ApiError, ApiNetworkError } from '@/services/api/client';

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

type StreamEvent =
  | { type: 'delta'; text: string }
  | {
      type: 'done';
      content: string;
      workspaceId: string;
      provider?: string;
      model?: string;
    }
  | { type: 'error'; message: string };

function buildChatBody(message: string, options: ChatOptions, workspaceId: string) {
  const history = (options.history ?? [])
    .filter((turn) => turn.role === 'user' || turn.role === 'chief')
    .slice(-8)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, 2000),
    }))
    .filter((turn) => turn.content.length > 0);

  return {
    message: message.trim(),
    workspaceId,
    focusId: options.focusId,
    history,
  };
}

async function parseNdjsonStream(
  response: Response,
  onDelta: (text: string) => void,
): Promise<ChiefChatResponse> {
  const body = response.body;
  if (!body || typeof body.getReader !== 'function') {
    throw new ApiNetworkError('Streaming body unavailable.');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let workspaceId = '';
  let provider: string | undefined;
  let model: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event: StreamEvent;
      try {
        event = JSON.parse(trimmed) as StreamEvent;
      } catch {
        continue;
      }

      if (event.type === 'delta' && event.text) {
        content += event.text;
        onDelta(event.text);
      } else if (event.type === 'done') {
        content = event.content?.trim() || content;
        workspaceId = event.workspaceId || workspaceId;
        provider = event.provider;
        model = event.model;
      } else if (event.type === 'error') {
        throw new ApiError(503, event.message || 'Chief stream failed.', event.message);
      }
    }
  }

  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer.trim()) as StreamEvent;
      if (event.type === 'done') {
        content = event.content?.trim() || content;
        workspaceId = event.workspaceId || workspaceId;
        provider = event.provider;
        model = event.model;
      } else if (event.type === 'error') {
        throw new ApiError(503, event.message || 'Chief stream failed.', event.message);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
    }
  }

  if (!content.trim()) {
    throw new ApiNetworkError('Chief stream ended without content.');
  }

  return { content: content.trim(), workspaceId, provider, model };
}

/**
 * Live Chief chat — backend builds structured workspace context and calls the model.
 */
export const chiefChatRepository = {
  async send(message: string, options: ChatOptions = {}): Promise<ChiefChatResponse> {
    const workspaceId =
      options.workspaceId?.trim() || (await ensureActiveWorkspaceId());

    try {
      return await apiJson<ChiefChatResponse>('/v1/chief/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildChatBody(message, options, workspaceId)),
      });
    } catch (error) {
      if (error instanceof ApiError || error instanceof ApiNetworkError) {
        throw error;
      }
      throw new ApiNetworkError('Chief chat request failed.');
    }
  },

  /**
   * Prefer NDJSON stream; on transport/parse failure fall back to one-shot send.
   */
  async sendStream(
    message: string,
    options: ChatOptions = {},
    onDelta?: (text: string) => void,
  ): Promise<ChiefChatResponse> {
    const workspaceId =
      options.workspaceId?.trim() || (await ensureActiveWorkspaceId());
    const body = buildChatBody(message, options, workspaceId);

    try {
      const response = await apiFetch('/v1/chief/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let serverMessage: string | undefined;
        try {
          const errBody = (await response.json()) as { message?: string | string[] };
          if (typeof errBody.message === 'string') serverMessage = errBody.message.trim();
          else if (Array.isArray(errBody.message) && errBody.message[0]) {
            serverMessage = String(errBody.message[0]);
          }
        } catch {
          // ignore
        }
        throw new ApiError(
          response.status,
          serverMessage ?? `Request failed (${response.status}).`,
          serverMessage,
        );
      }

      return await parseNdjsonStream(response, onDelta ?? (() => undefined));
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }
      return chiefChatRepository.send(message, options);
    }
  },

  /** True when the client should prefer live chat over local mock replies. */
  shouldUseLiveChat(): boolean {
    if (!env.isApiConfigured) return false;
    return env.aiProvider !== 'mock';
  },
};
