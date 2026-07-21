export type NormalizedProviderMessage = {
  providerMessageId: string;
  channelId: string | null;
  channelName: string | null;
  threadId: string | null;
  text: string | null;
  permalink: string | null;
  authorId: string | null;
  authorName: string | null;
  sentAt: Date | null;
  raw: Record<string, unknown>;
};

type SlackMessagePayload = {
  ts?: unknown;
  text?: unknown;
  user?: unknown;
  username?: unknown;
  channel?:
    | string
    | {
        id?: unknown;
        name?: unknown;
      };
  channel_id?: unknown;
  permalink?: unknown;
  thread_ts?: unknown;
  bot_id?: unknown;
};

export function normalizeSlackMessage(
  payload: Record<string, unknown>,
  providerItemId?: string,
): NormalizedProviderMessage | null {
  const data = payload as SlackMessagePayload;
  const ts = typeof data.ts === 'string' ? data.ts : null;
  const channelId = resolveChannelId(data);
  const providerMessageId =
    providerItemId ||
    (ts && channelId ? `${channelId}:${ts}` : ts);
  if (!providerMessageId) return null;

  const text =
    typeof data.text === 'string' && data.text.trim().length > 0
      ? data.text.trim()
      : null;
  // Skip empty / system noise without text.
  if (!text) return null;

  return {
    providerMessageId,
    channelId,
    channelName: resolveChannelName(data),
    threadId: typeof data.thread_ts === 'string' ? data.thread_ts : null,
    text: text.slice(0, 4000),
    permalink: typeof data.permalink === 'string' ? data.permalink : null,
    authorId: typeof data.user === 'string' ? data.user : null,
    authorName: typeof data.username === 'string' ? data.username : null,
    sentAt: tsToDate(ts),
    raw: payload,
  };
}

function resolveChannelId(data: SlackMessagePayload): string | null {
  if (typeof data.channel_id === 'string') return data.channel_id;
  if (typeof data.channel === 'string') return data.channel;
  if (data.channel && typeof data.channel === 'object') {
    return typeof data.channel.id === 'string' ? data.channel.id : null;
  }
  return null;
}

function resolveChannelName(data: SlackMessagePayload): string | null {
  if (data.channel && typeof data.channel === 'object') {
    return typeof data.channel.name === 'string' ? data.channel.name : null;
  }
  return null;
}

function tsToDate(ts: string | null): Date | null {
  if (!ts) return null;
  const seconds = Number(ts.split('.')[0]);
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000);
}
