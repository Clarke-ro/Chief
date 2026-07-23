import { Injectable, Logger } from '@nestjs/common';
import { IntegrationProvider, SyncResource } from '@prisma/client';
import { emptyBatch } from '../../fetch/sync-fetcher';
import type { FetchContext, RawSyncBatch, SyncResourceFetcher } from '../../sync.types';
import { ProviderApiError, providerFetchJson } from '../provider-http';

type SlackConversationsList = {
  ok: boolean;
  error?: string;
  channels?: Array<{
    id?: string;
    name?: string;
    is_member?: boolean;
    is_im?: boolean;
    is_mpim?: boolean;
    is_private?: boolean;
  }>;
  response_metadata?: { next_cursor?: string };
};

type SlackHistory = {
  ok: boolean;
  error?: string;
  messages?: Array<Record<string, unknown>>;
  has_more?: boolean;
  response_metadata?: { next_cursor?: string };
};

type SlackSearchMessages = {
  ok: boolean;
  error?: string;
  messages?: {
    matches?: Array<{
      ts?: string;
      text?: string;
      user?: string;
      username?: string;
      permalink?: string;
      channel?: { id?: string; name?: string };
    }>;
  };
};

/**
 * Pulls recent Slack messages for channels the user is in.
 * Prefers conversations.history; falls back to search.messages when history scopes are missing.
 */
@Injectable()
export class SlackMessagesFetcher implements SyncResourceFetcher {
  readonly provider = IntegrationProvider.slack;
  readonly resource = SyncResource.messages;
  private readonly logger = new Logger(SlackMessagesFetcher.name);

  async fetch(ctx: FetchContext): Promise<RawSyncBatch> {
    try {
      return await this.fetchRecent(ctx);
    } catch (error) {
      if (error instanceof ProviderApiError && (error.status === 401 || error.status === 403)) {
        this.logger.warn(
          {
            connectedAccountId: ctx.connectedAccountId,
            status: error.status,
          },
          'Slack messages unavailable — reconnect Slack',
        );
        return emptyBatch(ctx, {
          items: [],
          cursorAfter: ctx.cursor,
          meta: {
            checkpointKind: 'slack.insufficient_scope',
            itemCount: 0,
            needsReconnect: true,
          },
        });
      }
      throw error;
    }
  }

  private async fetchRecent(ctx: FetchContext): Promise<RawSyncBatch> {
    const viaHistory = await this.fetchViaHistory(ctx);
    if (viaHistory.items.length > 0) {
      return viaHistory.batch;
    }

    // Existing installs often lack *:history — search:read still returns recent messages.
    const viaSearch = await this.fetchViaSearch(ctx);
    if (viaSearch.items.length > 0 || viaHistory.needsReconnect) {
      this.logger.log(
        {
          connectedAccountId: ctx.connectedAccountId,
          historyCount: viaHistory.items.length,
          searchCount: viaSearch.items.length,
          needsReconnect: viaHistory.needsReconnect,
          mode: ctx.window.mode,
        },
        'Slack messages fetch (search fallback)',
      );
      return emptyBatch(ctx, {
        items: viaSearch.items,
        cursorAfter: `slack:${ctx.window.mode}:${new Date().toISOString()}`,
        meta: {
          checkpointKind:
            ctx.window.mode === 'incremental'
              ? 'slack.incremental'
              : 'slack.initial',
          itemCount: viaSearch.items.length,
          mode: ctx.window.mode,
          source: 'search.messages',
          needsReconnect: viaHistory.needsReconnect && viaSearch.items.length === 0,
        },
      });
    }

    this.logger.log(
      {
        connectedAccountId: ctx.connectedAccountId,
        channelCount: viaHistory.channelCount,
        itemCount: 0,
        mode: ctx.window.mode,
        needsReconnect: viaHistory.needsReconnect,
      },
      'Slack messages fetch',
    );

    return emptyBatch(ctx, {
      items: [],
      cursorAfter: `slack:${ctx.window.mode}:${new Date().toISOString()}`,
      meta: {
        checkpointKind:
          ctx.window.mode === 'incremental'
            ? 'slack.incremental'
            : 'slack.initial',
        itemCount: 0,
        channelCount: viaHistory.channelCount,
        mode: ctx.window.mode,
        needsReconnect: viaHistory.needsReconnect,
      },
    });
  }

  private async fetchViaHistory(ctx: FetchContext): Promise<{
    items: RawSyncBatch['items'];
    batch: RawSyncBatch;
    channelCount: number;
    needsReconnect: boolean;
  }> {
    const channels = await this.listChannels(ctx.accessToken);
    const items: RawSyncBatch['items'] = [];
    const oldest = String(Math.floor(ctx.window.from.getTime() / 1000));
    const latest = String(Math.floor(ctx.window.to.getTime() / 1000));
    let missingScopeHits = 0;
    let historyAttempts = 0;

    for (const channel of channels.slice(0, 12)) {
      let cursor: string | undefined;
      let pages = 0;
      do {
        const params = new URLSearchParams({
          channel: channel.id,
          oldest,
          latest,
          inclusive: 'true',
          limit: '50',
        });
        if (cursor) params.set('cursor', cursor);

        historyAttempts += 1;
        const data = await this.slackGet<SlackHistory>(
          ctx.accessToken,
          `https://slack.com/api/conversations.history?${params}`,
        );
        if (!data.ok) {
          if (data.error === 'missing_scope' || data.error === 'not_in_channel') {
            if (data.error === 'missing_scope') missingScopeHits += 1;
            this.logger.warn(
              { channelId: channel.id, error: data.error },
              'Slack history skipped',
            );
          } else {
            this.logger.debug(
              { channelId: channel.id, error: data.error },
              'Slack history skipped',
            );
          }
          break;
        }

        for (const message of data.messages ?? []) {
          const ts = typeof message.ts === 'string' ? message.ts : null;
          if (!ts) continue;
          if (typeof message.subtype === 'string' && message.subtype !== 'bot_message') {
            continue;
          }
          items.push({
            providerItemId: `${channel.id}:${ts}`,
            occurredAt: new Date(Number(ts.split('.')[0]) * 1000).toISOString(),
            payload: {
              ...message,
              channel: { id: channel.id, name: channel.name },
              channel_id: channel.id,
            },
          });
        }

        cursor = data.response_metadata?.next_cursor || undefined;
        pages += 1;
      } while (cursor && pages < 2);
    }

    const needsReconnect =
      historyAttempts > 0 && missingScopeHits > 0 && missingScopeHits >= Math.min(historyAttempts, 3);

    const batch = emptyBatch(ctx, {
      items,
      cursorAfter: `slack:${ctx.window.mode}:${new Date().toISOString()}`,
      meta: {
        checkpointKind:
          ctx.window.mode === 'incremental'
            ? 'slack.incremental'
            : 'slack.initial',
        itemCount: items.length,
        channelCount: Math.min(channels.length, 12),
        mode: ctx.window.mode,
        source: 'conversations.history',
        needsReconnect: needsReconnect && items.length === 0,
      },
    });

    if (items.length > 0) {
      this.logger.log(
        {
          connectedAccountId: ctx.connectedAccountId,
          channelCount: channels.length,
          itemCount: items.length,
          mode: ctx.window.mode,
        },
        'Slack messages fetch',
      );
    }

    return {
      items,
      batch,
      channelCount: channels.length,
      needsReconnect,
    };
  }

  private async fetchViaSearch(ctx: FetchContext): Promise<{
    items: RawSyncBatch['items'];
  }> {
    const after = ctx.window.from.toISOString().slice(0, 10);
    const params = new URLSearchParams({
      query: `after:${after}`,
      sort: 'timestamp',
      sort_dir: 'desc',
      count: '50',
    });

    const data = await this.slackGet<SlackSearchMessages>(
      ctx.accessToken,
      `https://slack.com/api/search.messages?${params}`,
    );

    if (!data.ok) {
      this.logger.warn(
        { error: data.error, connectedAccountId: ctx.connectedAccountId },
        'Slack search.messages failed',
      );
      return { items: [] };
    }

    const items: RawSyncBatch['items'] = [];
    for (const match of data.messages?.matches ?? []) {
      const ts = typeof match.ts === 'string' ? match.ts : null;
      const channelId =
        match.channel && typeof match.channel.id === 'string'
          ? match.channel.id
          : null;
      if (!ts || !channelId) continue;
      const text = typeof match.text === 'string' ? match.text.trim() : '';
      if (!text) continue;

      items.push({
        providerItemId: `${channelId}:${ts}`,
        occurredAt: new Date(Number(ts.split('.')[0]) * 1000).toISOString(),
        payload: {
          ts,
          text,
          user: match.user,
          username: match.username,
          permalink: match.permalink,
          channel: {
            id: channelId,
            name: match.channel?.name,
          },
          channel_id: channelId,
        },
      });
    }

    return { items };
  }

  private async listChannels(
    accessToken: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const channels: Array<{ id: string; name: string }> = [];
    let cursor: string | undefined;
    let pages = 0;

    do {
      const params = new URLSearchParams({
        types: 'public_channel,private_channel,mpim,im',
        exclude_archived: 'true',
        limit: '100',
      });
      if (cursor) params.set('cursor', cursor);

      const data = await this.slackGet<SlackConversationsList>(
        accessToken,
        `https://slack.com/api/conversations.list?${params}`,
      );
      if (!data.ok) {
        throw new ProviderApiError(
          `Slack conversations.list failed: ${data.error ?? 'unknown'}`,
          400,
          false,
          data.error,
        );
      }

      for (const ch of data.channels ?? []) {
        if (!ch.id) continue;
        if (ch.is_im || ch.is_mpim || ch.is_member !== false) {
          channels.push({
            id: ch.id,
            name: ch.name || (ch.is_im ? 'dm' : ch.id),
          });
        }
      }

      cursor = data.response_metadata?.next_cursor || undefined;
      pages += 1;
    } while (cursor && pages < 3);

    return channels;
  }

  private async slackGet<T extends { ok: boolean; error?: string }>(
    accessToken: string,
    url: string,
  ): Promise<T> {
    return providerFetchJson<T>(url, {
      accessToken,
      authScheme: 'Bearer',
    });
  }
}
