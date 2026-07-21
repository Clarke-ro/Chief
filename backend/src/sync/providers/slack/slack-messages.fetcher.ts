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

/**
 * Pulls recent messages from channels the user is in (conversations.history).
 * Caps channels + pages so onboarding sync stays bounded.
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
    const channels = await this.listChannels(ctx.accessToken);
    const items: RawSyncBatch['items'] = [];
    const oldest = String(Math.floor(ctx.window.from.getTime() / 1000));
    const latest = String(Math.floor(ctx.window.to.getTime() / 1000));

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

        const data = await this.slackGet<SlackHistory>(
          ctx.accessToken,
          `https://slack.com/api/conversations.history?${params}`,
        );
        if (!data.ok) {
          this.logger.debug(
            { channelId: channel.id, error: data.error },
            'Slack history skipped',
          );
          break;
        }

        for (const message of data.messages ?? []) {
          const ts = typeof message.ts === 'string' ? message.ts : null;
          if (!ts) continue;
          // Skip channel join / subtype noise without user text.
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

    this.logger.log(
      {
        connectedAccountId: ctx.connectedAccountId,
        channelCount: channels.length,
        itemCount: items.length,
        mode: ctx.window.mode,
      },
      'Slack messages fetch',
    );

    return emptyBatch(ctx, {
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
      },
    });
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
        // Prefer channels the user is in; IMs always include them.
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
    // Slack expects the user token as Bearer; some older tokens are bare.
    return providerFetchJson<T>(url, {
      accessToken,
      authScheme: 'Bearer',
    });
  }
}
